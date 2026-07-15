import type { PublicClient } from "viem";
import type Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { ChainReaderPort } from "../chain/chain-reader.port";
import { createWsChainClient } from "../chain/viem-ws-client";
import { backfill, BackfillConfig } from "../backfill/backfill";

export interface LiveConfig extends BackfillConfig {
  wsRpcUrl: string;
  pollIntervalMs: number;
}

export interface LiveHandle {
  stop: () => void;
}

/**
 * Keeps calling backfill() forever. Polling (every `pollIntervalMs`) is the
 * reliable baseline — it alone guarantees catch-up within one interval
 * regardless of websocket state, so correctness never depends on the
 * websocket working. The websocket subscription runs alongside it purely as
 * a latency optimization: each new-block notification triggers an
 * immediate extra tick instead of waiting for the next poll. If the socket
 * drops, viem reconnects it with backoff on its own (see
 * docs/08-blockchain-indexer.md §3/§8) — nothing here needs to coordinate
 * that, since polling already keeps ingesting in the meantime either way.
 *
 * backfill() is what actually enforces CONFIRMATIONS and reorg
 * detection/rewind and is fully idempotent, and tick() never overlaps
 * itself, so it's safe for both triggers to call it concurrently.
 */
export function runLive(
  client: PublicClient,
  prisma: PrismaClient,
  chainReader: ChainReaderPort,
  redis: Redis,
  config: LiveConfig,
): LiveHandle {
  let ticking = false;

  const tick = async (): Promise<void> => {
    if (ticking) {
      return; // a backfill() call is still in flight; let it finish before the next trigger
    }
    ticking = true;
    try {
      const batches = await backfill(client, prisma, chainReader, redis, config);
      if (batches > 0) {
        console.log(`[live] processed ${batches} batch(es)`);
      }
    } catch (error) {
      console.error("[live] tick failed:", error);
    } finally {
      ticking = false;
    }
  };

  console.log(`[live] polling every ${config.pollIntervalMs}ms`);
  const pollTimer = setInterval(() => void tick(), config.pollIntervalMs);

  let unwatch: (() => void) | undefined;
  try {
    const wsClient = createWsChainClient(config.wsRpcUrl);
    unwatch = wsClient.watchBlockNumber({
      onBlockNumber: () => void tick(),
      onError: (error) => {
        console.error("[live] websocket error (polling continues as a fallback):", error);
      },
    });
    console.log("[live] subscribed to new blocks via websocket (in addition to polling)");
  } catch (error) {
    console.error("[live] failed to establish websocket, relying on polling only:", error);
  }

  void tick(); // catch up immediately rather than waiting for the first poll/block

  return {
    stop: () => {
      unwatch?.();
      clearInterval(pollTimer);
    },
  };
}
