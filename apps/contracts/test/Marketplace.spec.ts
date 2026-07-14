import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { Marketplace, MarketplaceNFT } from "../typechain-types";

const NFT_NAME = "Test NFT";
const NFT_SYMBOL = "TNFT";
const SAMPLE_URI = "ipfs://bafybeigsample000000000000000000000000000000000000000/1";
const FEE_BPS = 250n; // 2.5%
const ROYALTY_BPS = 500n; // 5%
const PRICE = ethers.parseEther("1");

async function deployFixture() {
  const [owner, seller, buyer, royaltyReceiver, feeRecipient, other] = await ethers.getSigners();

  const MarketplaceNFTFactory = await ethers.getContractFactory("MarketplaceNFT", owner);
  const nftProxy = await upgrades.deployProxy(MarketplaceNFTFactory, [NFT_NAME, NFT_SYMBOL], { kind: "uups" });
  await nftProxy.waitForDeployment();
  const nft = nftProxy as unknown as MarketplaceNFT;

  const MarketplaceFactory = await ethers.getContractFactory("Marketplace", owner);
  const marketplaceProxy = await upgrades.deployProxy(MarketplaceFactory, [feeRecipient.address, FEE_BPS], {
    kind: "uups",
  });
  await marketplaceProxy.waitForDeployment();
  const marketplace = marketplaceProxy as unknown as Marketplace;

  await nft.connect(seller).mint(seller.address, SAMPLE_URI, royaltyReceiver.address, ROYALTY_BPS);
  const tokenId = 0n;

  return { owner, seller, buyer, royaltyReceiver, feeRecipient, other, nft, marketplace, tokenId };
}

async function listFixture() {
  const ctx = await deployFixture();
  await ctx.nft.connect(ctx.seller).approve(await ctx.marketplace.getAddress(), ctx.tokenId);
  const tx = await ctx.marketplace.connect(ctx.seller).list(await ctx.nft.getAddress(), ctx.tokenId, PRICE);
  await tx.wait();
  const listingId = 0n;
  return { ...ctx, listingId };
}

describe("Marketplace", () => {
  describe("initialize", () => {
    it("sets feeRecipient, feeBps and owner", async () => {
      const { marketplace, owner, feeRecipient } = await loadFixture(deployFixture);

      expect(await marketplace.owner()).to.equal(owner.address);
      expect(await marketplace.feeRecipient()).to.equal(feeRecipient.address);
      expect(await marketplace.feeBps()).to.equal(FEE_BPS);
    });

    it("reverts when feeBps exceeds MAX_FEE_BPS", async () => {
      const [owner, feeRecipient] = await ethers.getSigners();
      const MarketplaceFactory = await ethers.getContractFactory("Marketplace", owner);

      await expect(
        upgrades.deployProxy(MarketplaceFactory, [feeRecipient.address, 501n], { kind: "uups" }),
      ).to.be.revertedWithCustomError(MarketplaceFactory, "FeeExceedsMax");
    });

    it("reverts when feeRecipient is the zero address", async () => {
      const [owner] = await ethers.getSigners();
      const MarketplaceFactory = await ethers.getContractFactory("Marketplace", owner);

      await expect(
        upgrades.deployProxy(MarketplaceFactory, [ethers.ZeroAddress, FEE_BPS], { kind: "uups" }),
      ).to.be.revertedWithCustomError(MarketplaceFactory, "ZeroAddress");
    });

    it("reverts when called a second time", async () => {
      const { marketplace, feeRecipient } = await loadFixture(deployFixture);

      await expect(marketplace.initialize(feeRecipient.address, FEE_BPS)).to.be.revertedWithCustomError(
        marketplace,
        "InvalidInitialization",
      );
    });
  });

  describe("list", () => {
    it("creates an active listing and emits Listed", async () => {
      const { marketplace, nft, seller, tokenId } = await loadFixture(deployFixture);
      const nftAddress = await nft.getAddress();
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);

      await expect(marketplace.connect(seller).list(nftAddress, tokenId, PRICE))
        .to.emit(marketplace, "Listed")
        .withArgs(0n, nftAddress, tokenId, seller.address, PRICE);

      const listing = await marketplace.getListing(0n);
      expect(listing.nft).to.equal(nftAddress);
      expect(listing.tokenId).to.equal(tokenId);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(PRICE);
      expect(listing.status).to.equal(0n); // ACTIVE
    });

    it("reverts if price is zero", async () => {
      const { marketplace, nft, seller, tokenId } = await loadFixture(deployFixture);
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);

      await expect(
        marketplace.connect(seller).list(await nft.getAddress(), tokenId, 0n),
      ).to.be.revertedWithCustomError(marketplace, "PriceMustBePositive");
    });

    it("reverts if caller is not the token owner", async () => {
      const { marketplace, nft, buyer, tokenId } = await loadFixture(deployFixture);

      await expect(
        marketplace.connect(buyer).list(await nft.getAddress(), tokenId, PRICE),
      ).to.be.revertedWithCustomError(marketplace, "NotTokenOwner");
    });

    it("reverts if the marketplace is not approved", async () => {
      const { marketplace, nft, seller, tokenId } = await loadFixture(deployFixture);

      await expect(
        marketplace.connect(seller).list(await nft.getAddress(), tokenId, PRICE),
      ).to.be.revertedWithCustomError(marketplace, "MarketplaceNotApproved");
    });

    it("reverts when paused", async () => {
      const { marketplace, nft, seller, owner, tokenId } = await loadFixture(deployFixture);
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
      await marketplace.connect(owner).pause();

      await expect(
        marketplace.connect(seller).list(await nft.getAddress(), tokenId, PRICE),
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });
  });

  describe("cancel", () => {
    it("marks the listing CANCELLED", async () => {
      const { marketplace, seller, listingId } = await loadFixture(listFixture);

      await expect(marketplace.connect(seller).cancel(listingId)).to.emit(marketplace, "Cancelled").withArgs(listingId);

      const listing = await marketplace.getListing(listingId);
      expect(listing.status).to.equal(1n); // CANCELLED
    });

    it("reverts if caller is not the seller", async () => {
      const { marketplace, other, listingId } = await loadFixture(listFixture);

      await expect(marketplace.connect(other).cancel(listingId)).to.be.revertedWithCustomError(
        marketplace,
        "NotSeller",
      );
    });

    it("reverts if the listing is not active", async () => {
      const { marketplace, seller, listingId } = await loadFixture(listFixture);
      await marketplace.connect(seller).cancel(listingId);

      await expect(marketplace.connect(seller).cancel(listingId)).to.be.revertedWithCustomError(
        marketplace,
        "ListingNotActive",
      );
    });
  });

  describe("buy", () => {
    it("transfers the NFT and splits proceeds among seller, royalty receiver and fee recipient", async () => {
      const { marketplace, nft, buyer, seller, royaltyReceiver, feeRecipient, listingId, tokenId } =
        await loadFixture(listFixture);

      await expect(marketplace.connect(buyer).buy(listingId, { value: PRICE }))
        .to.emit(marketplace, "Sold")
        .withArgs(listingId, buyer.address, PRICE);

      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);

      const feeAmount = (PRICE * FEE_BPS) / 10_000n;
      const royaltyAmount = (PRICE * ROYALTY_BPS) / 10_000n;
      const sellerAmount = PRICE - feeAmount - royaltyAmount;

      expect(await marketplace.pendingWithdrawals(seller.address)).to.equal(sellerAmount);
      expect(await marketplace.pendingWithdrawals(royaltyReceiver.address)).to.equal(royaltyAmount);
      expect(await marketplace.pendingWithdrawals(feeRecipient.address)).to.equal(feeAmount);
      expect(sellerAmount + royaltyAmount + feeAmount).to.equal(PRICE);

      const listing = await marketplace.getListing(listingId);
      expect(listing.status).to.equal(2n); // SOLD
    });

    it("reverts with an incorrect msg.value", async () => {
      const { marketplace, buyer, listingId } = await loadFixture(listFixture);

      await expect(
        marketplace.connect(buyer).buy(listingId, { value: PRICE - 1n }),
      ).to.be.revertedWithCustomError(marketplace, "IncorrectPayment");
    });

    it("reverts if the listing is not active", async () => {
      const { marketplace, seller, buyer, listingId } = await loadFixture(listFixture);
      await marketplace.connect(seller).cancel(listingId);

      await expect(
        marketplace.connect(buyer).buy(listingId, { value: PRICE }),
      ).to.be.revertedWithCustomError(marketplace, "ListingNotActive");
    });

    it("reverts if the seller revoked the marketplace's approval before buy", async () => {
      const { marketplace, nft, seller, buyer, listingId } = await loadFixture(listFixture);
      await nft.connect(seller).approve(ethers.ZeroAddress, 0n);

      await expect(
        marketplace.connect(buyer).buy(listingId, { value: PRICE }),
      ).to.be.revertedWithCustomError(marketplace, "MarketplaceNoLongerApproved");
    });

    it("reverts if the seller no longer owns the token", async () => {
      const { marketplace, nft, seller, buyer, other, listingId, tokenId } = await loadFixture(listFixture);
      // Seller transfers the NFT away without cancelling the stale listing.
      await nft.connect(seller).transferFrom(seller.address, other.address, tokenId);

      await expect(
        marketplace.connect(buyer).buy(listingId, { value: PRICE }),
      ).to.be.revertedWithCustomError(marketplace, "SellerNoLongerOwnsToken");
    });

    it("reverts when paused", async () => {
      const { marketplace, owner, buyer, listingId } = await loadFixture(listFixture);
      await marketplace.connect(owner).pause();

      await expect(
        marketplace.connect(buyer).buy(listingId, { value: PRICE }),
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });
  });

  describe("withdraw", () => {
    it("sends the pending balance and zeroes it", async () => {
      const { marketplace, seller, buyer, listingId } = await loadFixture(listFixture);
      await marketplace.connect(buyer).buy(listingId, { value: PRICE });
      const pending = await marketplace.pendingWithdrawals(seller.address);

      await expect(marketplace.connect(seller).withdraw()).to.changeEtherBalance(seller, pending);

      expect(await marketplace.pendingWithdrawals(seller.address)).to.equal(0n);
    });

    it("reverts if there is nothing to withdraw", async () => {
      const { marketplace, other } = await loadFixture(deployFixture);

      await expect(marketplace.connect(other).withdraw()).to.be.revertedWithCustomError(
        marketplace,
        "NothingToWithdraw",
      );
    });
  });

  describe("admin", () => {
    it("owner can update feeBps and feeRecipient", async () => {
      const { marketplace, owner, other } = await loadFixture(deployFixture);

      await expect(marketplace.connect(owner).setFeeBps(100n)).to.emit(marketplace, "FeeUpdated").withArgs(100n);
      expect(await marketplace.feeBps()).to.equal(100n);

      await expect(marketplace.connect(owner).setFeeRecipient(other.address))
        .to.emit(marketplace, "FeeRecipientUpdated")
        .withArgs(other.address);
      expect(await marketplace.feeRecipient()).to.equal(other.address);
    });

    it("reverts fee update above MAX_FEE_BPS", async () => {
      const { marketplace, owner } = await loadFixture(deployFixture);

      await expect(marketplace.connect(owner).setFeeBps(501n)).to.be.revertedWithCustomError(
        marketplace,
        "FeeExceedsMax",
      );
    });

    it("reverts admin calls and pause/unpause from a non-owner", async () => {
      const { marketplace, other } = await loadFixture(deployFixture);

      await expect(marketplace.connect(other).setFeeBps(100n)).to.be.revertedWithCustomError(
        marketplace,
        "OwnableUnauthorizedAccount",
      );
      await expect(marketplace.connect(other).setFeeRecipient(other.address)).to.be.revertedWithCustomError(
        marketplace,
        "OwnableUnauthorizedAccount",
      );
      await expect(marketplace.connect(other).pause()).to.be.revertedWithCustomError(
        marketplace,
        "OwnableUnauthorizedAccount",
      );
    });
  });
});
