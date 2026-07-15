import type { PublicClient } from "viem";
import { Prisma, PrismaClient } from "@prisma/client";

export interface ReorgConfig {
  cursorSource: string;
  reorgCheckDepth: bigint;
}

export interface BlockHashRecord {
  blockNumber: bigint;
  blockHash: string;
}

/**
 * Compares the cursor's stored block hash against the live chain. If they've
 * diverged, walks the retained IndexerBlockHash window backward to find the
 * common ancestor, rewinds every projection row tied to blocks after it, and
 * moves the cursor back to the ancestor so the caller's normal forward
 * ingestion re-applies from there. No-op on a fresh DB (no cursor yet) or
 * when the stored hash still matches — see docs/08-blockchain-indexer.md §4.
 *
 * All chain reads (and the DB reads used to pick the ancestor) happen before
 * any transaction opens — an earlier version did this RPC round-tripping
 * inside a single DB transaction and, against real Sepolia latency, blew
 * past Prisma's ~5s interactive-transaction timeout. Only the actual rewind
 * writes are wrapped in a (fast, DB-only) transaction.
 */
export async function checkAndRewindReorg(
  prisma: PrismaClient,
  client: PublicClient,
  config: ReorgConfig,
): Promise<void> {
  const cursor = await prisma.indexerCursor.findUnique({ where: { source: config.cursorSource } });
  if (!cursor) {
    return;
  }

  const chainBlock = await client.getBlock({ blockNumber: cursor.lastIndexedBlock });
  if (chainBlock.hash === cursor.lastIndexedBlockHash) {
    return;
  }

  console.warn(
    `[reorg] hash mismatch at block ${cursor.lastIndexedBlock}: ` +
      `stored=${cursor.lastIndexedBlockHash} chain=${chainBlock.hash} — searching for common ancestor`,
  );

  const ancestorBlock = await findCommonAncestor(prisma, client, config);
  const ancestorBlockData = await client.getBlock({ blockNumber: ancestorBlock });

  await prisma.$transaction(async (tx) => {
    await rewindProjection(tx, ancestorBlock);
    await tx.indexerBlockHash.deleteMany({
      where: { source: config.cursorSource, blockNumber: { gt: ancestorBlock } },
    });
    await tx.indexerCursor.update({
      where: { source: config.cursorSource },
      data: { lastIndexedBlock: ancestorBlock, lastIndexedBlockHash: ancestorBlockData.hash },
    });
  });

  console.warn(`[reorg] rewound to common ancestor block ${ancestorBlock}`);
}

/** Walks our own retained block-hash window backward (most recent first) and
 * returns the first block number whose stored hash still matches the live
 * chain — that's the common ancestor. Throws if the reorg is deeper than the
 * window, since that's beyond what this can safely resolve without a full
 * rebuild-from-chain (see docs/08-blockchain-indexer.md §9 runbook). */
async function findCommonAncestor(
  prisma: PrismaClient,
  client: PublicClient,
  config: ReorgConfig,
): Promise<bigint> {
  const trackedBlocks = await prisma.indexerBlockHash.findMany({
    where: { source: config.cursorSource },
    orderBy: { blockNumber: "desc" },
  });

  for (const tracked of trackedBlocks) {
    const chainBlock = await client.getBlock({ blockNumber: tracked.blockNumber });
    if (chainBlock.hash === tracked.blockHash) {
      return tracked.blockNumber;
    }
  }

  throw new Error(
    `[reorg] no common ancestor found within the tracked ${config.reorgCheckDepth}-block window ` +
      `(source=${config.cursorSource}) — reorg is deeper than INDEXER_REORG_CHECK_DEPTH; ` +
      `a full rebuild-from-chain is required`,
  );
}

/** Deletes/reverts every projection row tied to a block after `ancestorBlock`.
 * Transfer/Sale are append-only logs, so they're a straight delete. Token and
 * Listing are mutable projections, so they're reset rather than deleted:
 * Token.ownerAddress falls back to the latest remaining Transfer for that
 * token; Listing either reverts to ACTIVE (if it existed before the reorg
 * and only its Cancelled/Sold event is being undone) or is deleted outright
 * (if the Listed event itself happened after the ancestor). DB-only (no
 * chain reads), so it's safe to run inside a transaction. */
async function rewindProjection(tx: Prisma.TransactionClient, ancestorBlock: bigint): Promise<void> {
  const orphanedTransfers = await tx.transfer.findMany({
    where: { blockNumber: { gt: ancestorBlock } },
    select: { tokenId: true },
  });
  const orphanedTokenIds = [...new Set(orphanedTransfers.map((t) => t.tokenId))];

  await tx.transfer.deleteMany({ where: { blockNumber: { gt: ancestorBlock } } });
  await tx.sale.deleteMany({ where: { blockNumber: { gt: ancestorBlock } } });

  for (const tokenId of orphanedTokenIds) {
    const latestRemaining = await tx.transfer.findFirst({
      where: { tokenId },
      orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
    });
    // If nothing remains, the token's mint itself was reorged out — beyond
    // what a CONFIRMATIONS-deep rewind is expected to handle; left as-is.
    if (latestRemaining) {
      await tx.token.update({ where: { id: tokenId }, data: { ownerAddress: latestRemaining.toAddress } });
    }
  }

  const orphanedListings = await tx.listing.findMany({ where: { lastEventBlock: { gt: ancestorBlock } } });
  for (const listing of orphanedListings) {
    if (listing.listedAtBlock > ancestorBlock) {
      await tx.listing.delete({ where: { id: listing.id } });
    } else {
      await tx.listing.update({
        where: { id: listing.id },
        data: { status: "ACTIVE", lastEventBlock: listing.listedAtBlock },
      });
    }
  }
}

/** Fetches the live chain's hash for each block in the trailing
 * `reorgCheckDepth` window up to `toBlock`, in parallel. Pure RPC reads, no
 * DB — call this before opening a DB transaction (see checkAndRewindReorg's
 * doc comment for why: a real RPC round trip per block, done sequentially
 * inside a transaction, can exceed Prisma's interactive-transaction
 * timeout). */
export async function fetchBlockHashWindow(
  client: PublicClient,
  toBlock: bigint,
  depth: bigint,
): Promise<BlockHashRecord[]> {
  const windowStart = toBlock - depth + 1n > 0n ? toBlock - depth + 1n : 0n;

  const blockNumbers: bigint[] = [];
  for (let blockNumber = windowStart; blockNumber <= toBlock; blockNumber++) {
    blockNumbers.push(blockNumber);
  }

  return Promise.all(
    blockNumbers.map(async (blockNumber) => {
      const block = await client.getBlock({ blockNumber });
      return { blockNumber, blockHash: block.hash };
    }),
  );
}

/** Persists a previously fetched block-hash window (see
 * fetchBlockHashWindow) and prunes anything older — DB-only, safe to call
 * inside a transaction alongside a batch's other writes. */
export async function storeBlockHashWindow(
  tx: Prisma.TransactionClient,
  config: ReorgConfig,
  window: BlockHashRecord[],
): Promise<void> {
  if (window.length === 0) {
    return;
  }

  for (const { blockNumber, blockHash } of window) {
    await tx.indexerBlockHash.upsert({
      where: { source_blockNumber: { source: config.cursorSource, blockNumber } },
      create: { source: config.cursorSource, blockNumber, blockHash },
      update: { blockHash },
    });
  }

  const windowStart = window[0].blockNumber;
  await tx.indexerBlockHash.deleteMany({
    where: { source: config.cursorSource, blockNumber: { lt: windowStart } },
  });
}
