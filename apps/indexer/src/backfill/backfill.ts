import type { Log, PublicClient } from "viem";
import type Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { decodeMarketplaceLog, decodeMarketplaceNftLog } from "../decode/decode-log";
import { DecodedEvent } from "../decode/types";
import { ChainReaderPort } from "../chain/chain-reader.port";
import { applyEvent } from "../apply/apply-event";
import { ProjectionMessage } from "../apply/messages";
import { getCursor, setCursor } from "../cursor/cursor";
import { checkAndRewindReorg, fetchBlockHashWindow, storeBlockHashWindow } from "../reorg/reorg";
import { publishMessages } from "../redis/publisher";

export interface BackfillConfig {
  nftAddress: string;
  marketplaceAddress: string;
  startBlock: bigint;
  confirmations: bigint;
  blockRange: bigint;
  cursorSource: string;
  reorgCheckDepth: bigint;
}

function decodeLog(log: Log, config: BackfillConfig): DecodedEvent | null {
  const address = log.address.toLowerCase();
  if (address === config.nftAddress) {
    return decodeMarketplaceNftLog(log);
  }
  if (address === config.marketplaceAddress) {
    return decodeMarketplaceLog(log);
  }
  return null;
}

function sortLogs(logs: Log[]): Log[] {
  return [...logs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return (a.blockNumber ?? 0n) < (b.blockNumber ?? 0n) ? -1 : 1;
    }
    return (a.logIndex ?? 0) - (b.logIndex ?? 0);
  });
}

/** Paginated getLogs from the cursor's position (or config.startBlock, on a
 * fresh DB) up to `latest - confirmations`, applying each batch inside a
 * single DB transaction alongside the cursor update. Returns the number of
 * batches processed. */
export async function backfill(
  client: PublicClient,
  prisma: PrismaClient,
  chainReader: ChainReaderPort,
  redis: Redis,
  config: BackfillConfig,
): Promise<number> {
  await checkAndRewindReorg(prisma, client, config);

  const cursor = await getCursor(prisma, config.cursorSource);
  let fromBlock = cursor ? cursor.lastIndexedBlock + 1n : config.startBlock;

  const latestBlock = await client.getBlockNumber();
  const safeToBlock = latestBlock > config.confirmations ? latestBlock - config.confirmations : -1n;

  let batches = 0;
  while (fromBlock <= safeToBlock) {
    const rangeEnd = fromBlock + config.blockRange - 1n;
    const toBlock = rangeEnd > safeToBlock ? safeToBlock : rangeEnd;

    const logs = await client.getLogs({
      address: [config.nftAddress as `0x${string}`, config.marketplaceAddress as `0x${string}`],
      fromBlock,
      toBlock,
    });
    const sortedLogs = sortLogs(logs);
    const toBlockData = await client.getBlock({ blockNumber: toBlock });
    const blockHashWindow = await fetchBlockHashWindow(client, toBlock, config.reorgCheckDepth);

    const messages: ProjectionMessage[] = [];
    await prisma.$transaction(async (tx) => {
      for (const log of sortedLogs) {
        const decoded = decodeLog(log, config);
        if (decoded) {
          const message = await applyEvent(tx, chainReader, decoded);
          if (message) {
            messages.push(message);
          }
        }
      }
      await setCursor(tx, config.cursorSource, {
        lastIndexedBlock: toBlock,
        lastIndexedBlockHash: toBlockData.hash,
      });
      await storeBlockHashWindow(tx, config, blockHashWindow);
    });
    // Published only after the transaction above has committed — Redis
    // pub/sub isn't transactional, so a rolled-back batch must never have
    // told subscribers about a change that didn't actually happen.
    await publishMessages(redis, messages);

    console.log(`[backfill] blocks ${fromBlock}-${toBlock}: ${sortedLogs.length} log(s) applied`);
    batches++;
    fromBlock = toBlock + 1n;
  }

  return batches;
}
