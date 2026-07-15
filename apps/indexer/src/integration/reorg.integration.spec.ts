import "dotenv/config";
import Redis from "ioredis";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { PrismaClient } from "@prisma/client";
import { MARKETPLACE_ABI, MARKETPLACE_NFT_ABI } from "@we3/contracts-abi";
import { startHardhatNode, HardhatNodeHandle } from "./hardhat-node";
import { createTestClients, deployContracts, DeployedContracts } from "./deploy";
import { ViemChainReader } from "../chain/viem-chain-reader";
import { backfill, BackfillConfig } from "../backfill/backfill";

// A real simulated reorg: snapshot the actual local Hardhat chain
// (evm_snapshot), advance it with a Cancelled event, index that with the
// real backfill(), then evm_revert back to the snapshot and mine a
// *different* transaction (a Sold instead) at the same height. That's a
// genuine chain divergence at a block the indexer already committed to its
// cursor — checkAndRewindReorg (see docs/08-blockchain-indexer.md §4) has
// to detect the hash mismatch, find the common ancestor, undo the
// Cancelled projection, and re-apply the real (new) Sold event. See
// docs/milestones/milestone-05-blockchain-indexer.md task 8.
//
// Uses a different deployer account (#2) than backfill.integration.spec.ts
// (#0) so the two test files' deterministic CREATE addresses never collide.
// That alone isn't enough, though: rewindProjection's Transfer/Sale/Listing
// queries filter by blockNumber only (see reorg.ts — correct for
// production, which only ever tracks one chain), and two independent local
// Hardhat chains both produce small, overlapping block numbers. Running
// this file concurrently with another integration test against the same
// we3_marketplace_test database once caused a real cross-test race (one
// test's rewind deleted rows that belonged to the other, mid-transaction).
// package.json's `test` script runs Jest with `--runInBand` specifically to
// prevent that — every integration test file must run to completion
// (including its own cleanup) before the next one starts.
jest.setTimeout(60_000);

const PORT = 8611;
const CURSOR_SOURCE = "hardhat-reorg-test";
const DEPLOYER_PRIVATE_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as const; // account #2
const BUYER_PRIVATE_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" as const; // account #3
const TEST_DATABASE_URL =
  process.env.INTEGRATION_TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/we3_marketplace_test?schema=public";

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6380";
const publisherRedis = new Redis(redisUrl);

let node: HardhatNodeHandle;
let deployed: DeployedContracts;

async function cleanupDb(nftAddress: string): Promise<void> {
  await prisma.sale.deleteMany({ where: { listing: { token: { collection: { contractAddress: nftAddress } } } } });
  await prisma.listing.deleteMany({ where: { token: { collection: { contractAddress: nftAddress } } } });
  await prisma.transfer.deleteMany({ where: { token: { collection: { contractAddress: nftAddress } } } });
  await prisma.token.deleteMany({ where: { collection: { contractAddress: nftAddress } } });
  await prisma.collection.deleteMany({ where: { contractAddress: nftAddress } });
  await prisma.indexerBlockHash.deleteMany({ where: { source: CURSOR_SOURCE } });
  await prisma.indexerCursor.deleteMany({ where: { source: CURSOR_SOURCE } });
}

afterAll(async () => {
  await cleanupDb(deployed.nftAddress.toLowerCase());
  publisherRedis.disconnect();
  await prisma.$disconnect();
  await node.stop();
});

it("detects a real chain reorg, rewinds the orphaned Cancelled projection, and re-applies the real Sold event", async () => {
  node = await startHardhatNode(PORT);
  const { publicClient } = createTestClients(node.rpcUrl);
  const deployer = createWalletClient({ account: privateKeyToAccount(DEPLOYER_PRIVATE_KEY), chain: hardhat, transport: http(node.rpcUrl) });
  const buyer = createWalletClient({ account: privateKeyToAccount(BUYER_PRIVATE_KEY), chain: hardhat, transport: http(node.rpcUrl) });

  deployed = await deployContracts(publicClient, deployer, deployer.account.address);
  const nftAddress = deployed.nftAddress.toLowerCase() as `0x${string}`;
  const marketplaceAddress = deployed.marketplaceAddress.toLowerCase() as `0x${string}`;
  await cleanupDb(nftAddress);

  const price = 1_000_000_000_000_000n;
  const deployerAddress = deployer.account.address;

  const mintHash = await deployer.writeContract({
    address: deployed.nftAddress,
    abi: MARKETPLACE_NFT_ABI,
    functionName: "mint",
    args: [deployerAddress, "ipfs://reorg-token", deployerAddress, 500],
    account: deployer.account,
    chain: hardhat,
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });

  const approveHash = await deployer.writeContract({
    address: deployed.nftAddress,
    abi: MARKETPLACE_NFT_ABI,
    functionName: "setApprovalForAll",
    args: [deployed.marketplaceAddress, true],
    account: deployer.account,
    chain: hardhat,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  const listHash = await deployer.writeContract({
    address: deployed.marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "list",
    args: [deployed.nftAddress, 0n, price],
    account: deployer.account,
    chain: hardhat,
  });
  await publicClient.waitForTransactionReceipt({ hash: listHash });

  const chainReader = new ViemChainReader(publicClient);
  const config: BackfillConfig = {
    nftAddress,
    marketplaceAddress,
    startBlock: 0n,
    confirmations: 0n,
    blockRange: 10_000n,
    cursorSource: CURSOR_SOURCE,
    reorgCheckDepth: 20n,
  };

  // Index up through the Listed event.
  await backfill(publicClient, prisma, chainReader, publisherRedis, config);
  const listingBeforeReorg = await prisma.listing.findUniqueOrThrow({ where: { onchainListingId: 0n } });
  expect(listingBeforeReorg.status).toBe("ACTIVE");

  // Snapshot right here — this is the common ancestor the reorg will later
  // need to be found and rewound back to.
  const snapshotId = await publicClient.request({ method: "evm_snapshot" as never, params: [] as never });

  // Advance the chain with a Cancelled event and index it for real.
  const cancelHash = await deployer.writeContract({
    address: deployed.marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "cancel",
    args: [0n],
    account: deployer.account,
    chain: hardhat,
  });
  await publicClient.waitForTransactionReceipt({ hash: cancelHash });
  await backfill(publicClient, prisma, chainReader, publisherRedis, config);

  const listingAfterCancel = await prisma.listing.findUniqueOrThrow({ where: { onchainListingId: 0n } });
  expect(listingAfterCancel.status).toBe("CANCELLED");

  // Revert the chain back to the snapshot (undoing the cancel entirely —
  // as far as the chain is concerned it never happened) and mine a
  // *different* transaction at the same height: the buyer buys instead.
  await publicClient.request({ method: "evm_revert" as never, params: [snapshotId] as never });

  const buyHash = await buyer.writeContract({
    address: deployed.marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "buy",
    args: [0n],
    account: buyer.account,
    chain: hardhat,
    value: price,
  });
  await publicClient.waitForTransactionReceipt({ hash: buyHash });

  // This run must detect the hash mismatch at the cursor's block, rewind
  // the now-orphaned Cancelled projection back to ACTIVE, then re-apply
  // the real Sold event on top.
  await backfill(publicClient, prisma, chainReader, publisherRedis, config);

  const finalListing = await prisma.listing.findUniqueOrThrow({ where: { onchainListingId: 0n } });
  expect(finalListing.status).toBe("SOLD");

  const sale = await prisma.sale.findUniqueOrThrow({ where: { listingId: finalListing.id } });
  expect(sale.priceWei.toString()).toBe(price.toString());
  expect(sale.buyerAddress.toLowerCase()).toBe(buyer.account.address.toLowerCase());

  // Exactly one listing row throughout — the reorg must never have
  // duplicated it.
  expect(await prisma.listing.count({ where: { onchainListingId: 0n } })).toBe(1);
});
