import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { MarketplaceNFT } from "../typechain-types";

const NAME = "Marketplace NFT";
const SYMBOL = "MNFT";
const SAMPLE_URI = "ipfs://bafybeigsample000000000000000000000000000000000000000/1";

async function deployFixture() {
  const [owner, minter, buyer, royaltyReceiver] = await ethers.getSigners();

  const MarketplaceNFTFactory = await ethers.getContractFactory("MarketplaceNFT", owner);
  const proxy = await upgrades.deployProxy(MarketplaceNFTFactory, [NAME, SYMBOL], {
    kind: "uups",
  });
  await proxy.waitForDeployment();
  const nft = proxy as unknown as MarketplaceNFT;

  return { nft, owner, minter, buyer, royaltyReceiver };
}

describe("MarketplaceNFT", () => {
  describe("initialize", () => {
    it("sets name, symbol and owner", async () => {
      const { nft, owner } = await loadFixture(deployFixture);

      expect(await nft.name()).to.equal(NAME);
      expect(await nft.symbol()).to.equal(SYMBOL);
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("reverts when called a second time", async () => {
      const { nft } = await loadFixture(deployFixture);

      await expect(nft.initialize(NAME, SYMBOL)).to.be.revertedWithCustomError(
        nft,
        "InvalidInitialization",
      );
    });
  });

  describe("mint", () => {
    it("mints a token with the given uri and royalty info", async () => {
      const { nft, minter, buyer, royaltyReceiver } = await loadFixture(deployFixture);

      await expect(nft.connect(minter).mint(buyer.address, SAMPLE_URI, royaltyReceiver.address, 500))
        .to.emit(nft, "Transfer")
        .withArgs(ethers.ZeroAddress, buyer.address, 0);

      expect(await nft.ownerOf(0)).to.equal(buyer.address);
      expect(await nft.tokenURI(0)).to.equal(SAMPLE_URI);

      const salePrice = 10_000n;
      const [receiver, royaltyAmount] = await nft.royaltyInfo(0, salePrice);
      expect(receiver).to.equal(royaltyReceiver.address);
      expect(royaltyAmount).to.equal((salePrice * 500n) / 10_000n);
    });

    it("increments token ids across mints", async () => {
      const { nft, minter, buyer, royaltyReceiver } = await loadFixture(deployFixture);

      await nft.connect(minter).mint(buyer.address, SAMPLE_URI, royaltyReceiver.address, 250);
      await nft.connect(minter).mint(buyer.address, SAMPLE_URI, royaltyReceiver.address, 250);

      expect(await nft.ownerOf(0)).to.equal(buyer.address);
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
    });

    it("allows anyone to mint (open minting, no allowlist)", async () => {
      const { nft, buyer, royaltyReceiver } = await loadFixture(deployFixture);

      await expect(
        nft.connect(buyer).mint(buyer.address, SAMPLE_URI, royaltyReceiver.address, 100),
      ).to.not.be.reverted;
    });
  });

  describe("pause / unpause", () => {
    it("blocks minting and transfers while paused", async () => {
      const { nft, owner, minter, buyer, royaltyReceiver } = await loadFixture(deployFixture);

      await nft.connect(minter).mint(buyer.address, SAMPLE_URI, royaltyReceiver.address, 100);
      await nft.connect(owner).pause();

      await expect(
        nft.connect(minter).mint(buyer.address, SAMPLE_URI, royaltyReceiver.address, 100),
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");

      await expect(
        nft.connect(buyer).transferFrom(buyer.address, royaltyReceiver.address, 0),
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");
    });

    it("resumes minting and transfers after unpause", async () => {
      const { nft, owner, minter, buyer, royaltyReceiver } = await loadFixture(deployFixture);

      await nft.connect(owner).pause();
      await nft.connect(owner).unpause();

      await expect(
        nft.connect(minter).mint(buyer.address, SAMPLE_URI, royaltyReceiver.address, 100),
      ).to.not.be.reverted;
    });

    it("reverts pause/unpause when called by a non-owner", async () => {
      const { nft, minter } = await loadFixture(deployFixture);

      await expect(nft.connect(minter).pause()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount",
      );
      await expect(nft.connect(minter).unpause()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("access control", () => {
    it("reverts upgradeToAndCall when called by a non-owner", async () => {
      const { nft, minter } = await loadFixture(deployFixture);

      const MarketplaceNFTFactory = await ethers.getContractFactory("MarketplaceNFT", minter);
      const newImplementation = await MarketplaceNFTFactory.deploy();
      await newImplementation.waitForDeployment();

      await expect(
        nft.connect(minter).upgradeToAndCall(await newImplementation.getAddress(), "0x"),
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  describe("supportsInterface", () => {
    it("reports support for ERC721 and ERC2981", async () => {
      const { nft } = await loadFixture(deployFixture);

      const ERC721_INTERFACE_ID = "0x80ac58cd";
      const ERC2981_INTERFACE_ID = "0x2a55205a";

      expect(await nft.supportsInterface(ERC721_INTERFACE_ID)).to.equal(true);
      expect(await nft.supportsInterface(ERC2981_INTERFACE_ID)).to.equal(true);
    });
  });
});
