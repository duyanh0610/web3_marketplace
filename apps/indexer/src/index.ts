import { PrismaClient } from "@prisma/client";
import { config } from "./config";
import { createChainClient } from "./chain/viem-client";
import { ViemChainReader } from "./chain/viem-chain-reader";
import { createRedisPublisher } from "./redis/publisher";
import { runLive } from "./live/live";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const client = createChainClient(config.sepoliaRpcUrl);
  const chainReader = new ViemChainReader(client);
  const redis = createRedisPublisher(config.redisUrl);

  console.log(
    `[indexer] starting nft=${config.nftAddress} marketplace=${config.marketplaceAddress} ` +
      `startBlock=${config.startBlock} confirmations=${config.confirmations}`,
  );

  const live = runLive(client, prisma, chainReader, redis, {
    nftAddress: config.nftAddress,
    marketplaceAddress: config.marketplaceAddress,
    startBlock: config.startBlock,
    confirmations: config.confirmations,
    blockRange: config.backfillBlockRange,
    cursorSource: config.cursorSource,
    reorgCheckDepth: config.reorgCheckDepth,
    wsRpcUrl: config.sepoliaWsRpcUrl,
    pollIntervalMs: config.pollIntervalMs,
  });

  const shutdown = async (): Promise<void> => {
    console.log("[indexer] shutting down...");
    live.stop();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
