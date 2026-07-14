import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { Marketplace, MarketplaceNFT } from "../typechain-types";

const NFT_NAME = "Test NFT";
const NFT_SYMBOL = "TNFT";
const SAMPLE_URI = "ipfs://bafybeigsample000000000000000000000000000000000000000/1";

interface SplitCase {
  label: string;
  price: bigint;
  feeBps: bigint;
  royaltyBps: bigint;
}

const CASES: SplitCase[] = [
  { label: "typical price/fee/royalty", price: ethers.parseEther("1"), feeBps: 250n, royaltyBps: 500n },
  { label: "zero royalty", price: ethers.parseEther("1"), feeBps: 250n, royaltyBps: 0n },
  { label: "zero fee", price: ethers.parseEther("1"), feeBps: 0n, royaltyBps: 500n },
  { label: "zero fee and zero royalty", price: ethers.parseEther("1"), feeBps: 0n, royaltyBps: 0n },
  { label: "max protocol fee (5%)", price: ethers.parseEther("1"), feeBps: 500n, royaltyBps: 500n },
  {
    label: "max protocol fee + near-100% royalty (royalty gets capped, seller absorbs shortfall)",
    price: ethers.parseEther("1"),
    feeBps: 500n,
    royaltyBps: 9_999n,
  },
  { label: "tiny price causing integer-division rounding dust", price: 7n, feeBps: 250n, royaltyBps: 333n },
  { label: "price of exactly 1 wei", price: 1n, feeBps: 500n, royaltyBps: 500n },
  { label: "large odd price, odd bps", price: 999_999_999_999_999_999n, feeBps: 137n, royaltyBps: 271n },
];

describe("Marketplace fee/royalty split invariant", () => {
  for (const testCase of CASES) {
    it(`sellerAmount + royaltyAmount + feeAmount == price — ${testCase.label}`, async () => {
      const [owner, seller, buyer, royaltyReceiver, feeRecipient] = await ethers.getSigners();

      const MarketplaceNFTFactory = await ethers.getContractFactory("MarketplaceNFT", owner);
      const nftProxy = await upgrades.deployProxy(MarketplaceNFTFactory, [NFT_NAME, NFT_SYMBOL], { kind: "uups" });
      await nftProxy.waitForDeployment();
      const nft = nftProxy as unknown as MarketplaceNFT;

      const MarketplaceFactory = await ethers.getContractFactory("Marketplace", owner);
      const marketplaceProxy = await upgrades.deployProxy(
        MarketplaceFactory,
        [feeRecipient.address, testCase.feeBps],
        { kind: "uups" },
      );
      await marketplaceProxy.waitForDeployment();
      const marketplace = marketplaceProxy as unknown as Marketplace;

      await nft.connect(seller).mint(seller.address, SAMPLE_URI, royaltyReceiver.address, testCase.royaltyBps);
      const tokenId = 0n;
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
      await marketplace.connect(seller).list(await nft.getAddress(), tokenId, testCase.price);
      const listingId = 0n;

      await marketplace.connect(buyer).buy(listingId, { value: testCase.price });

      const sellerAmount = await marketplace.pendingWithdrawals(seller.address);
      const royaltyAmount = await marketplace.pendingWithdrawals(royaltyReceiver.address);
      const feeAmount = await marketplace.pendingWithdrawals(feeRecipient.address);

      expect(sellerAmount + royaltyAmount + feeAmount).to.equal(testCase.price);
      // None of the three splits can be negative in Solidity (would revert
      // with a panic on underflow instead) — reaching this point without a
      // revert already proves that, but assert non-negativity explicitly
      // for readability of intent.
      expect(sellerAmount).to.be.gte(0n);
      expect(royaltyAmount).to.be.gte(0n);
      expect(feeAmount).to.be.gte(0n);
    });
  }
});
