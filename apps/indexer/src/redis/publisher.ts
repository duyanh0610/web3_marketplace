import Redis from "ioredis";
import { ProjectionMessage } from "../apply/messages";

export function createRedisPublisher(redisUrl: string): Redis {
  return new Redis(redisUrl);
}

/** Publishes each message on its channel — called after the DB transaction
 * that produced them has already committed (see backfill.ts), since Redis
 * pub/sub isn't transactional and a rolled-back batch must never have
 * published a change that didn't actually happen. */
export async function publishMessages(redis: Redis, messages: ProjectionMessage[]): Promise<void> {
  for (const message of messages) {
    await redis.publish(message.channel, JSON.stringify(message.payload));
  }
}
