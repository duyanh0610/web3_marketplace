import "dotenv/config";
import { getMarketplaceAddress, getMarketplaceNftAddress } from "@we3/contracts-abi";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing required env var: ${name}`);
  }
  return value;
}

// Single network for this project's scope (Sepolia only) — see
// docs/03-system-architecture.md. Not made configurable since there is
// nowhere else to point it yet.
const NETWORK = "sepolia" as const;

export const config = {
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: requireEnv("REDIS_URL"),
  sepoliaRpcUrl: requireEnv("SEPOLIA_RPC_URL"),
  // Used only for the live-mode new-block subscription (see
  // docs/08-blockchain-indexer.md §3) — all actual log/block reads still go
  // through the http client above.
  sepoliaWsRpcUrl: requireEnv("SEPOLIA_WS_RPC_URL"),
  confirmations: BigInt(process.env.INDEXER_CONFIRMATIONS ?? "5"),
  // Verified against Infura's real Sepolia endpoint: a range (toBlock -
  // fromBlock) of exactly 10000 succeeds, 10001 fails with "range 10001
  // exceeds limit of 10000". Kept well under that as a safety margin (other
  // providers, or Infura tightening the limit later, shouldn't break this).
  backfillBlockRange: BigInt(process.env.INDEXER_BACKFILL_BLOCK_RANGE ?? "5000"),
  startBlock: BigInt(requireEnv("INDEXER_START_BLOCK")),
  // How many blocks of per-block hash history to retain behind the cursor
  // (see docs/08-blockchain-indexer.md §4). Must be well beyond
  // CONFIRMATIONS since it's the deepest reorg the indexer can identify a
  // common ancestor for without a full rebuild-from-chain; 4x confirmations
  // is a comfortable margin for Sepolia's occasional shallow reorgs.
  reorgCheckDepth: BigInt(process.env.INDEXER_REORG_CHECK_DEPTH ?? "20"),
  // Fallback cadence for live mode when the websocket subscription is down
  // (see docs/08-blockchain-indexer.md §3/§8) — Sepolia's block time is
  // ~12s, so this still catches up well within a couple of blocks' latency.
  pollIntervalMs: Number(process.env.INDEXER_POLL_INTERVAL_MS ?? "15000"),
  nftAddress: getMarketplaceNftAddress(NETWORK).toLowerCase(),
  marketplaceAddress: getMarketplaceAddress(NETWORK).toLowerCase(),
  // Single cursor covering both contracts — see docs/08-blockchain-indexer.md
  // §4: logs from both are combined and applied in strict block+logIndex
  // order (a Listed event depends on its token's prior mint already being
  // applied), so tracking progress per-contract independently would risk
  // applying them out of order.
  cursorSource: "sepolia",
};
