import "dotenv/config";
import type { PublicClient } from "viem";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  checkAndRewindReorg,
  fetchBlockHashWindow,
  storeBlockHashWindow,
  ReorgConfig,
} from "./reorg";

// checkAndRewindReorg opens its own internal transaction (see reorg.ts's doc
// comment — RPC calls must happen outside any DB transaction to avoid
// blowing Prisma's interactive-transaction timeout against real network
// latency), so unlike apply-event.spec.ts's rolled-back-transaction pattern,
// these tests seed data with real commits against local Postgres and clean
// up afterward. The chain itself is faked (a map of blockNumber -> hash)
// since simulating a real reorg is covered by the dedicated Hardhat-based
// reorg simulation test (Milestone 5 step 8).
const prisma = new PrismaClient();

const SOURCE = "test-source";
const NFT_ADDRESS = "0xnft-reorg-test";
const CONFIG: ReorgConfig = { cursorSource: SOURCE, reorgCheckDepth: 20n };

function fakeClient(hashes: Record<string, string>): PublicClient {
  return {
    getBlock: async ({ blockNumber }: { blockNumber: bigint }) => {
      const hash = hashes[blockNumber.toString()];
      if (!hash) {
        throw new Error(`fakeClient: no hash configured for block ${blockNumber}`);
      }
      return { hash };
    },
  } as unknown as PublicClient;
}

async function cleanupTestData(): Promise<void> {
  await prisma.sale.deleteMany({ where: { listing: { token: { collection: { contractAddress: NFT_ADDRESS } } } } });
  await prisma.listing.deleteMany({ where: { token: { collection: { contractAddress: NFT_ADDRESS } } } });
  await prisma.transfer.deleteMany({ where: { token: { collection: { contractAddress: NFT_ADDRESS } } } });
  await prisma.token.deleteMany({ where: { collection: { contractAddress: NFT_ADDRESS } } });
  await prisma.collection.deleteMany({ where: { contractAddress: NFT_ADDRESS } });
  await prisma.indexerBlockHash.deleteMany({ where: { source: SOURCE } });
  await prisma.indexerCursor.deleteMany({ where: { source: SOURCE } });
}

beforeEach(cleanupTestData);
afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("checkAndRewindReorg", () => {
  it("is a no-op when there is no cursor yet (fresh DB)", async () => {
    await checkAndRewindReorg(prisma, fakeClient({}), CONFIG);
    expect(await prisma.indexerCursor.findUnique({ where: { source: SOURCE } })).toBeNull();
  });

  it("is a no-op when the stored hash still matches the chain", async () => {
    await prisma.indexerCursor.create({
      data: { source: SOURCE, lastIndexedBlock: 10n, lastIndexedBlockHash: "0xabc" },
    });

    await checkAndRewindReorg(prisma, fakeClient({ "10": "0xabc" }), CONFIG);

    const cursor = await prisma.indexerCursor.findUniqueOrThrow({ where: { source: SOURCE } });
    expect(cursor.lastIndexedBlock).toBe(10n);
    expect(cursor.lastIndexedBlockHash).toBe("0xabc");
  });

  it("throws when the reorg is deeper than the tracked window", async () => {
    await prisma.indexerCursor.create({
      data: { source: SOURCE, lastIndexedBlock: 12n, lastIndexedBlockHash: "0xold12" },
    });
    await prisma.indexerBlockHash.createMany({
      data: [
        { source: SOURCE, blockNumber: 11n, blockHash: "0xold11" },
        { source: SOURCE, blockNumber: 12n, blockHash: "0xold12" },
      ],
    });

    // Chain returns a different hash for every tracked block — no ancestor found.
    const client = fakeClient({ "12": "0xnew12", "11": "0xnew11" });

    await expect(checkAndRewindReorg(prisma, client, CONFIG)).rejects.toThrow(/no common ancestor/);
  });

  // rewindProjection's Transfer/Sale/Listing queries filter by blockNumber
  // alone (no per-collection/source scoping — this project only ever tracks
  // one chain, see config.ts's NETWORK comment). checkAndRewindReorg commits
  // for real (see its doc comment), so a small ancestor block here would
  // ALSO delete/rewind any real Sepolia rows the shared dev DB happens to
  // have (their block numbers, ~11M+, are all "> 9"). This offset keeps the
  // test's fake blocks far beyond any real chain height for a very long
  // time, so this test can never again wipe real accumulated dev data
  // (which happened once — see git history / session notes).
  const BLOCK_OFFSET = 9_000_000_000n;

  it("finds the common ancestor, rewinds Token/Transfer/Listing, and moves the cursor back", async () => {
    // Chain state before the reorg: mint at block 5 (owner A), transfer to
    // B at block 9 (<= ancestor(9), survives), transfer to C at block 11
    // (> ancestor, reorged out — owner should revert back to B).
    const collection = await prisma.collection.create({
      data: { contractAddress: NFT_ADDRESS, name: "Test", symbol: "TST" },
    });
    const token = await prisma.token.create({
      data: {
        collectionId: collection.id,
        tokenId: 0n,
        ownerAddress: "0xC",
        tokenUri: "ipfs://1",
      },
    });
    await prisma.transfer.createMany({
      data: [
        {
          tokenId: token.id,
          fromAddress: "0x0",
          toAddress: "0xA",
          txHash: "0xmint",
          logIndex: 0,
          blockNumber: BLOCK_OFFSET + 5n,
        },
        {
          tokenId: token.id,
          fromAddress: "0xA",
          toAddress: "0xB",
          txHash: "0xt9",
          logIndex: 0,
          blockNumber: BLOCK_OFFSET + 9n,
        },
        {
          tokenId: token.id,
          fromAddress: "0xB",
          toAddress: "0xC",
          txHash: "0xt11",
          logIndex: 0,
          blockNumber: BLOCK_OFFSET + 11n,
        },
      ],
    });

    // Listing A: Listed at block 6 (<= ancestor), Sold at block 11 (reorged
    // out) — should revert to ACTIVE, Sale row deleted.
    const listingA = await prisma.listing.create({
      data: {
        onchainListingId: 100n,
        tokenId: token.id,
        sellerAddress: "0xA",
        priceWei: "1000",
        status: "SOLD",
        listedAtBlock: BLOCK_OFFSET + 6n,
        lastEventBlock: BLOCK_OFFSET + 11n,
      },
    });
    await prisma.sale.create({
      data: {
        listingId: listingA.id,
        buyerAddress: "0xC",
        priceWei: "1000",
        royaltyPaidWei: "0",
        feePaidWei: "0",
        txHash: "0xsold",
        blockNumber: BLOCK_OFFSET + 11n,
      },
    });

    // Listing B: Listed at block 10 (after ancestor) — should be deleted
    // entirely, since it never existed on the canonical chain.
    await prisma.listing.create({
      data: {
        onchainListingId: 101n,
        tokenId: token.id,
        sellerAddress: "0xA",
        priceWei: "2000",
        status: "ACTIVE",
        listedAtBlock: BLOCK_OFFSET + 10n,
        lastEventBlock: BLOCK_OFFSET + 10n,
      },
    });

    await prisma.indexerCursor.create({
      data: { source: SOURCE, lastIndexedBlock: BLOCK_OFFSET + 12n, lastIndexedBlockHash: "0xold12" },
    });
    // Tracked window: only block 9 still matches the (new) canonical chain.
    await prisma.indexerBlockHash.createMany({
      data: [
        { source: SOURCE, blockNumber: BLOCK_OFFSET + 8n, blockHash: "0xold8" },
        { source: SOURCE, blockNumber: BLOCK_OFFSET + 9n, blockHash: "0xold9" },
        { source: SOURCE, blockNumber: BLOCK_OFFSET + 10n, blockHash: "0xold10" },
        { source: SOURCE, blockNumber: BLOCK_OFFSET + 11n, blockHash: "0xold11" },
        { source: SOURCE, blockNumber: BLOCK_OFFSET + 12n, blockHash: "0xold12" },
      ],
    });

    const client = fakeClient({
      [(BLOCK_OFFSET + 12n).toString()]: "0xnew12",
      [(BLOCK_OFFSET + 11n).toString()]: "0xnew11",
      [(BLOCK_OFFSET + 10n).toString()]: "0xnew10",
      [(BLOCK_OFFSET + 9n).toString()]: "0xold9", // matches — this is the common ancestor
    });

    await checkAndRewindReorg(prisma, client, CONFIG);

    const cursor = await prisma.indexerCursor.findUniqueOrThrow({ where: { source: SOURCE } });
    expect(cursor.lastIndexedBlock).toBe(BLOCK_OFFSET + 9n);
    expect(cursor.lastIndexedBlockHash).toBe("0xold9");

    expect(await prisma.indexerBlockHash.count({ where: { source: SOURCE } })).toBe(2);

    const rewoundToken = await prisma.token.findUniqueOrThrow({ where: { id: token.id } });
    expect(rewoundToken.ownerAddress).toBe("0xB");
    expect(await prisma.transfer.count({ where: { tokenId: token.id } })).toBe(2); // block 11's transfer deleted

    const rewoundListingA = await prisma.listing.findUniqueOrThrow({ where: { onchainListingId: 100n } });
    expect(rewoundListingA.status).toBe("ACTIVE");
    expect(rewoundListingA.lastEventBlock).toBe(BLOCK_OFFSET + 6n);
    expect(await prisma.sale.findUnique({ where: { listingId: listingA.id } })).toBeNull();

    expect(await prisma.listing.findUnique({ where: { onchainListingId: 101n } })).toBeNull();
  });
});

describe("fetchBlockHashWindow", () => {
  it("fetches the trailing window up to toBlock, clamped at 0", async () => {
    const hashes: Record<string, string> = {};
    for (let n = 0; n <= 3; n++) {
      hashes[n.toString()] = `0xhash${n}`;
    }
    const client = fakeClient(hashes);

    const window = await fetchBlockHashWindow(client, 3n, 20n); // depth > toBlock, clamps at 0

    expect(window).toEqual([
      { blockNumber: 0n, blockHash: "0xhash0" },
      { blockNumber: 1n, blockHash: "0xhash1" },
      { blockNumber: 2n, blockHash: "0xhash2" },
      { blockNumber: 3n, blockHash: "0xhash3" },
    ]);
  });
});

describe("storeBlockHashWindow", () => {
  async function inRolledBackTransaction(fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
    const rollback = new Error("intentional rollback — not a real failure");
    await expect(
      prisma.$transaction(async (tx) => {
        await fn(tx);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  }

  it("stores the given window and prunes anything older", async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.indexerBlockHash.create({
        data: { source: SOURCE, blockNumber: 10n, blockHash: "0xstale" },
      });

      const window = [16n, 17n, 18n, 19n, 20n].map((n) => ({ blockNumber: n, blockHash: `0xhash${n}` }));
      await storeBlockHashWindow(tx, CONFIG, window);

      const rows = await tx.indexerBlockHash.findMany({
        where: { source: SOURCE },
        orderBy: { blockNumber: "asc" },
      });
      expect(rows.map((r) => r.blockNumber)).toEqual([16n, 17n, 18n, 19n, 20n]);
      expect(rows.map((r) => r.blockHash)).toEqual(["0xhash16", "0xhash17", "0xhash18", "0xhash19", "0xhash20"]);
    });
  });
});
