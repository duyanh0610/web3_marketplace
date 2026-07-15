import "dotenv/config";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { MARKETPLACE_ABI, MARKETPLACE_NFT_ABI } from "@we3/contracts-abi";
import { startHardhatNode, HardhatNodeHandle } from "./hardhat-node";
import { createTestClients, deployContracts, DeployedContracts } from "./deploy";
import { ViemChainReader } from "../chain/viem-chain-reader";
import { backfill, BackfillConfig } from "../backfill/backfill";

// Real end-to-end test: a real `hardhat node` running the actual compiled
// MarketplaceNFT/Marketplace contracts (see hardhat-node.ts/deploy.ts), a
// real sequence of on-chain transactions (mint, list, cancel, buy), the
// indexer's real backfill() against that chain, a real local Postgres, and
// a real Redis pub/sub round trip — nothing here is mocked. See
// docs/milestones/milestone-05-blockchain-indexer.md task 8.
//
// Runs against a DEDICATED test database (we3_marketplace_test), not the
// shared dev DB the rest of this project's manual Sepolia verification
// uses. That's not just tidiness: onchainListingId is globally unique in
// the schema (see schema.prisma), and a local Hardhat chain's Marketplace
// starts its own listingId counter at 0 too — the first run of this test
// against the shared dev DB silently collided with the real Sepolia
// listing (also id 0), matched its existing row instead of creating a new
// one, and made both the Listed and Sold events look like no-ops.
jest.setTimeout(60_000);

const PORT = 8600;
const CURSOR_SOURCE = "hardhat-integration-test";
const TEST_DATABASE_URL =
  process.env.INTEGRATION_TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/we3_marketplace_test?schema=public";

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
// Two separate connections, matching real usage: once a connection issues
// SUBSCRIBE it enters subscriber mode and Redis rejects any further PUBLISH
// on that same connection ("Connection in subscriber mode, only subscriber
// commands may be used") — publisherRedis is what backfill() publishes
// through, subscriberRedis is only used by this test to observe messages.
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6380";
const publisherRedis = new Redis(redisUrl);
const subscriberRedis = new Redis(redisUrl);

let node: HardhatNodeHandle;
let deployed: DeployedContracts;
let receivedMessages: { channel: string; payload: unknown }[] = [];

async function cleanupDb(nftAddress: string): Promise<void> {
  await prisma.sale.deleteMany({ where: { listing: { token: { collection: { contractAddress: nftAddress } } } } });
  await prisma.listing.deleteMany({ where: { token: { collection: { contractAddress: nftAddress } } } });
  await prisma.transfer.deleteMany({ where: { token: { collection: { contractAddress: nftAddress } } } });
  await prisma.token.deleteMany({ where: { collection: { contractAddress: nftAddress } } });
  await prisma.collection.deleteMany({ where: { contractAddress: nftAddress } });
  await prisma.indexerBlockHash.deleteMany({ where: { source: CURSOR_SOURCE } });
  await prisma.indexerCursor.deleteMany({ where: { source: CURSOR_SOURCE } });
}

async function waitForMessageCount(count: number, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (receivedMessages.length < count) {
    if (Date.now() > deadline) {
      throw new Error(`only received ${receivedMessages.length}/${count} redis messages within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

beforeAll(async () => {
  node = await startHardhatNode(PORT);

  const { publicClient, deployer, buyer } = createTestClients(node.rpcUrl);
  deployed = await deployContracts(publicClient, deployer, deployer.account!.address);
  const nftAddress = deployed.nftAddress.toLowerCase() as `0x${string}`;
  const marketplaceAddress = deployed.marketplaceAddress.toLowerCase() as `0x${string}`;

  await cleanupDb(nftAddress);

  await subscriberRedis.subscribe("token.transferred", "listing.updated");
  subscriberRedis.on("message", (channel, message) => {
    receivedMessages.push({ channel, payload: JSON.parse(message) });
  });

  const deployerAddress = deployer.account!.address;
  const buyerAddress = buyer.account!.address;
  const price = 1_000_000_000_000_000n; // 0.001 ETH

  // mint token 0 and token 1 to the seller (deployer account)
  for (const uri of ["ipfs://token0", "ipfs://token1"]) {
    const hash = await deployer.writeContract({
      address: deployed.nftAddress,
      abi: MARKETPLACE_NFT_ABI,
      functionName: "mint",
      args: [deployerAddress, uri, deployerAddress, 500],
      account: deployer.account!,
      chain: deployer.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  // approve the marketplace to move the seller's tokens
  const approveHash = await deployer.writeContract({
    address: deployed.nftAddress,
    abi: MARKETPLACE_NFT_ABI,
    functionName: "setApprovalForAll",
    args: [deployed.marketplaceAddress, true],
    account: deployer.account!,
    chain: deployer.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // list both tokens (listingId 0 and 1)
  for (const tokenId of [0n, 1n]) {
    const hash = await deployer.writeContract({
      address: deployed.marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "list",
      args: [deployed.nftAddress, tokenId, price],
      account: deployer.account!,
      chain: deployer.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  // cancel listing 1
  const cancelHash = await deployer.writeContract({
    address: deployed.marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "cancel",
    args: [1n],
    account: deployer.account!,
    chain: deployer.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash: cancelHash });

  // buyer buys listing 0
  const buyHash = await buyer.writeContract({
    address: deployed.marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "buy",
    args: [0n],
    account: buyer.account!,
    chain: buyer.chain,
    value: price,
  });
  await publicClient.waitForTransactionReceipt({ hash: buyHash });

  const chainReader = new ViemChainReader(publicClient);
  const config: BackfillConfig = {
    nftAddress,
    marketplaceAddress,
    startBlock: 0n,
    confirmations: 0n,
    blockRange: 10_000n,
    cursorSource: CURSOR_SOURCE,
    reorgCheckDepth: 5n,
  };

  await backfill(publicClient, prisma, chainReader, publisherRedis, config);
  await waitForMessageCount(7); // 3 token.transferred + 4 listing.updated (2x Listed, 1x Cancelled, 1x Sold)
});

afterAll(async () => {
  await cleanupDb(deployed.nftAddress.toLowerCase());
  publisherRedis.disconnect();
  subscriberRedis.disconnect();
  await prisma.$disconnect();
  await node.stop();
});

describe("indexer backfill against a real local Hardhat node", () => {
  it("projects the Collection and both Tokens with correct final owners", async () => {
    const nftAddress = deployed.nftAddress.toLowerCase();
    const collection = await prisma.collection.findUniqueOrThrow({
      where: { contractAddress: nftAddress },
      include: { tokens: true },
    });
    expect(collection.name).toBe("Integration Test NFT");
    expect(collection.symbol).toBe("ITNFT");
    expect(collection.tokens).toHaveLength(2);

    const token0 = collection.tokens.find((t) => t.tokenId === 0n)!;
    const token1 = collection.tokens.find((t) => t.tokenId === 1n)!;
    // token0 was sold to the buyer; token1's listing was cancelled, so it's
    // still owned by the seller — their owners must differ.
    expect(token0.ownerAddress.toLowerCase()).not.toBe(token1.ownerAddress.toLowerCase());
    expect(token1.royaltyBps).toBe(500);
  });

  it("projects both Listings in their correct final status", async () => {
    const nftAddress = deployed.nftAddress.toLowerCase();
    const listings = await prisma.listing.findMany({
      where: { token: { collection: { contractAddress: nftAddress } } },
      orderBy: { onchainListingId: "asc" },
    });
    expect(listings).toHaveLength(2);
    expect(listings[0].onchainListingId).toBe(0n);
    expect(listings[0].status).toBe("SOLD");
    expect(listings[1].onchainListingId).toBe(1n);
    expect(listings[1].status).toBe("CANCELLED");
  });

  it("projects one Sale tied to the sold listing", async () => {
    const nftAddress = deployed.nftAddress.toLowerCase();
    const sale = await prisma.sale.findFirstOrThrow({
      where: { listing: { token: { collection: { contractAddress: nftAddress } }, onchainListingId: 0n } },
    });
    expect(sale.priceWei.toString()).toBe("1000000000000000");
  });

  it("projects three Transfers (2 mints + 1 sale transfer)", async () => {
    const nftAddress = deployed.nftAddress.toLowerCase();
    const count = await prisma.transfer.count({ where: { token: { collection: { contractAddress: nftAddress } } } });
    expect(count).toBe(3);
  });

  it("publishes real Redis messages reflecting the final projection state", () => {
    const transferMessages = receivedMessages.filter((m) => m.channel === "token.transferred");
    const listingMessages = receivedMessages.filter((m) => m.channel === "listing.updated");
    expect(transferMessages.length).toBeGreaterThanOrEqual(3);
    expect(listingMessages.length).toBeGreaterThanOrEqual(4);

    const lastForListing = (id: string) =>
      [...listingMessages].reverse().find((m) => (m.payload as { onchainListingId: string }).onchainListingId === id);
    expect((lastForListing("0")!.payload as { status: string }).status).toBe("SOLD");
    expect((lastForListing("1")!.payload as { status: string }).status).toBe("CANCELLED");
  });
});
