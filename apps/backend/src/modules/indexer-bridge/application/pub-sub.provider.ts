import { Provider } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";

// The in-process event bus described in docs/05-backend-design.md §3
// (IndexerBridgeModule row) — one Redis subscriber (RedisSubscriberService)
// publishes here; GraphQL subscription resolvers read from it via
// asyncIterator. A single shared instance (not per-request) since it must
// outlive any individual subscription and be visible to every connected
// client's async iterator.
export const PUB_SUB = Symbol("PUB_SUB");

export const pubSubProvider: Provider = {
  provide: PUB_SUB,
  useValue: new PubSub(),
};

export const LISTING_UPDATED_TOPIC = "LISTING_UPDATED";
export const TOKEN_TRANSFERRED_TOPIC = "TOKEN_TRANSFERRED";
