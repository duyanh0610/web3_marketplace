import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { config } from "../config";
import { createChainClient } from "../chain/viem-client";
import { ViemChainReader } from "../chain/viem-chain-reader";
import { createRedisPublisher } from "../redis/publisher";
import { backfill } from "../backfill/backfill";

/**
 * "Rebuild from chain" runbook — see docs/07-database-design.md §7 and
 * docs/milestones/milestone-05-blockchain-indexer.md task 7. Wipes every
 * indexer-owned projection table (everything except Account/SiweSession,
 * which are genuinely off-chain and not part of this projection) plus the
 * indexer's own cursor/block-hash tables, then runs a full backfill from
 * INDEXER_START_BLOCK. This is what proves the projection is a pure,
 * reproducible function of chain history rather than something that could
 * silently drift from what's actually on-chain.
 *
 * Deletes in child-to-parent FK order inside one transaction so a crash
 * partway through never leaves an inconsistent half-wiped state.
 *
 * Usage: pnpm --filter @we3/indexer rebuild-from-chain
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();

  console.log("[rebuild] truncating projection tables...");
  await prisma.$transaction([
    prisma.sale.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.token.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.indexerBlockHash.deleteMany(),
    prisma.indexerCursor.deleteMany(),
  ]);

  const client = createChainClient(config.sepoliaRpcUrl);
  const chainReader = new ViemChainReader(client);
  const redis = createRedisPublisher(config.redisUrl);

  console.log(
    `[rebuild] backfilling from block ${config.startBlock} — ` +
      `nft=${config.nftAddress} marketplace=${config.marketplaceAddress}`,
  );
  const batches = await backfill(client, prisma, chainReader, redis, {
    nftAddress: config.nftAddress,
    marketplaceAddress: config.marketplaceAddress,
    startBlock: config.startBlock,
    confirmations: config.confirmations,
    blockRange: config.backfillBlockRange,
    cursorSource: config.cursorSource,
    reorgCheckDepth: config.reorgCheckDepth,
  });

  console.log(`[rebuild] complete: ${batches} batch(es) processed`);
  redis.disconnect();
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
