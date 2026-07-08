import "dotenv/config";

// Scaffold-only entry point. Real ingestion logic (backfill mode, live
// subscription, reorg detection/rewind) is implemented in Milestone 5 —
// see docs/08-blockchain-indexer.md and docs/milestones/milestone-05-blockchain-indexer.md.
function main(): void {
  console.log("[indexer] service scaffold started");
  console.log(`[indexer] DATABASE_URL set: ${Boolean(process.env.DATABASE_URL)}`);
  console.log(`[indexer] REDIS_URL set: ${Boolean(process.env.REDIS_URL)}`);
  console.log(`[indexer] SEPOLIA_RPC_URL set: ${Boolean(process.env.SEPOLIA_RPC_URL)}`);
}

main();
