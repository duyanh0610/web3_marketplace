import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { MarketplaceNFT, MarketplaceNFTV2 } from "../typechain-types";

const NAME = "Marketplace NFT";
const SYMBOL = "MNFT";
const SAMPLE_URI = "ipfs://bafybeigsample000000000000000000000000000000000000000/1";

async function deployV1Fixture() {
  const [owner, buyer, royaltyReceiver] = await ethers.getSigners();

  const MarketplaceNFTFactory = await ethers.getContractFactory("MarketplaceNFT", owner);
  const proxy = await upgrades.deployProxy(MarketplaceNFTFactory, [NAME, SYMBOL], {
    kind: "uups",
  });
  await proxy.waitForDeployment();
  const nft = proxy as unknown as MarketplaceNFT;

  await nft.mint(buyer.address, SAMPLE_URI, royaltyReceiver.address, 500);

  return { nft, owner, buyer, royaltyReceiver };
}

describe("MarketplaceNFT upgrade (V1 -> V2)", () => {
  it("passes hardhat-upgrades storage-layout validation and preserves state", async () => {
    const { nft, owner, buyer, royaltyReceiver } = await loadFixture(deployV1Fixture);
    const proxyAddress = await nft.getAddress();

    const MarketplaceNFTV2Factory = await ethers.getContractFactory("MarketplaceNFTV2", owner);
    const upgraded = (await upgrades.upgradeProxy(
      proxyAddress,
      MarketplaceNFTV2Factory,
    )) as unknown as MarketplaceNFTV2;

    expect(await upgraded.getAddress()).to.equal(proxyAddress);
    expect(await upgraded.version()).to.equal("v2");

    expect(await upgraded.name()).to.equal(NAME);
    expect(await upgraded.symbol()).to.equal(SYMBOL);
    expect(await upgraded.owner()).to.equal(owner.address);
    expect(await upgraded.ownerOf(0)).to.equal(buyer.address);
    expect(await upgraded.tokenURI(0)).to.equal(SAMPLE_URI);

    const [receiver, royaltyAmount] = await upgraded.royaltyInfo(0, 10_000n);
    expect(receiver).to.equal(royaltyReceiver.address);
    expect(royaltyAmount).to.equal(500n);
  });

  it("reverts the upgrade when called by a non-owner", async () => {
    const { nft, buyer } = await loadFixture(deployV1Fixture);

    const MarketplaceNFTV2Factory = await ethers.getContractFactory("MarketplaceNFTV2", buyer);
    await expect(upgrades.upgradeProxy(await nft.getAddress(), MarketplaceNFTV2Factory)).to.be.reverted;
  });
});
