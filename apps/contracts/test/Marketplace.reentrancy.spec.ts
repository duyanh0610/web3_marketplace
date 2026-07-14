import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { Marketplace, MarketplaceNFT, ReentrantAttacker } from "../typechain-types";

const NFT_NAME = "Test NFT";
const NFT_SYMBOL = "TNFT";
const SAMPLE_URI = "ipfs://bafybeigsample000000000000000000000000000000000000000/1";
const FEE_BPS = 250n;
const ROYALTY_BPS = 500n;
const PRICE = ethers.parseEther("1");

async function deployFixture() {
  const [owner, seller, buyer, royaltyReceiver, feeRecipient] = await ethers.getSigners();

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

  const AttackerFactory = await ethers.getContractFactory("ReentrantAttacker", owner);
  const attacker = (await AttackerFactory.deploy(await marketplace.getAddress())) as unknown as ReentrantAttacker;
  await attacker.waitForDeployment();

  return { owner, seller, buyer, royaltyReceiver, feeRecipient, nft, marketplace, attacker };
}

describe("Marketplace reentrancy", () => {
  it("reverts a reentrant buy() attempt from a malicious onERC721Received callback", async () => {
    const { nft, marketplace, seller, royaltyReceiver, attacker } = await loadFixture(deployFixture);

    await nft.connect(seller).mint(seller.address, SAMPLE_URI, royaltyReceiver.address, ROYALTY_BPS);
    const tokenId = 0n;
    await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
    await marketplace.connect(seller).list(await nft.getAddress(), tokenId, PRICE);
    const listingId = 0n;

    await expect(attacker.buyAndReenter(listingId, { value: PRICE })).to.be.revertedWithCustomError(
      marketplace,
      "ReentrancyGuardReentrantCall",
    );

    // The whole attack transaction rolled back — listing is untouched.
    const listing = await marketplace.getListing(listingId);
    expect(listing.status).to.equal(0n); // ACTIVE
  });

  it("reverts a reentrant withdraw() attempt from a malicious receive() callback", async () => {
    const { nft, marketplace, buyer, royaltyReceiver, attacker } = await loadFixture(deployFixture);
    const attackerAddress = await attacker.getAddress();

    await nft.mint(attackerAddress, SAMPLE_URI, royaltyReceiver.address, ROYALTY_BPS);
    const tokenId = 0n;
    await attacker.approveAndList(await nft.getAddress(), tokenId, PRICE);
    const listingId = 0n;

    await marketplace.connect(buyer).buy(listingId, { value: PRICE });
    const pendingBefore = await marketplace.pendingWithdrawals(attackerAddress);
    expect(pendingBefore).to.be.greaterThan(0n);

    // withdraw() sends ETH via a low-level `.call`, which does not bubble up
    // the callee's revert reason — it only reports success=false. The
    // reentrant withdraw() call inside receive() still reverts with
    // ReentrancyGuardReentrantCall internally, causing receive() itself to
    // revert, which makes the outer `.call` report failure; Marketplace then
    // surfaces its own WithdrawalTransferFailed error. Either way the attack
    // is blocked — this asserts the actual (correct) revert reason.
    await expect(attacker.withdrawAndReenter()).to.be.revertedWithCustomError(
      marketplace,
      "WithdrawalTransferFailed",
    );

    // Entire attack transaction rolled back — pending balance untouched.
    expect(await marketplace.pendingWithdrawals(attackerAddress)).to.equal(pendingBefore);
  });
});
