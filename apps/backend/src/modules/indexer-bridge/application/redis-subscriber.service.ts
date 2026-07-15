import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { PubSub } from "graphql-subscriptions";
import {
  LISTING_REPOSITORY,
  ListingRepository,
} from "@app/modules/marketplace/application/ports/listing-repository.port";
import { TOKEN_REPOSITORY, TokenRepository } from "@app/modules/catalog/application/ports/token-repository.port";
import {
  TRANSFER_REPOSITORY,
  TransferRepository,
} from "@app/modules/catalog/application/ports/transfer-repository.port";
import { toListingType } from "@app/modules/marketplace/presentation/mappers/listing.mapper";
import { PUB_SUB, LISTING_UPDATED_TOPIC, TOKEN_TRANSFERRED_TOPIC } from "@app/modules/indexer-bridge/application/pub-sub.provider";

// Channel names must match apps/indexer/src/apply/messages.ts exactly —
// see docs/08-blockchain-indexer.md §7.
const LISTING_UPDATED_CHANNEL = "listing.updated";
const TOKEN_TRANSFERRED_CHANNEL = "token.transferred";

interface ListingUpdatedPayload {
  onchainListingId: string;
}

interface TokenTransferredPayload {
  contractAddress: string;
  tokenId: string;
}

// The single Redis subscriber described in docs/05-backend-design.md §3 —
// one connection regardless of how many GraphQL clients are subscribed,
// re-publishing onto the in-process PubSub (see pub-sub.provider.ts) that
// each client's subscription resolver reads from independently.
//
// Both channels' Redis payloads are intentionally minimal (see
// apps/indexer/src/apply/messages.ts) — just enough to identify *what*
// changed, not the full new state. On receipt, this re-fetches the current
// row from Postgres so what's published is always a complete, correct
// GraphQL type (including nested `sale`, which the raw event never
// carries), not a partial reconstruction of the event payload.
@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private redis?: Redis;

  constructor(
    private readonly configService: ConfigService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(TOKEN_REPOSITORY) private readonly tokens: TokenRepository,
    @Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    this.redis = new Redis(this.configService.getOrThrow<string>("REDIS_URL"));
    await this.redis.subscribe(LISTING_UPDATED_CHANNEL, TOKEN_TRANSFERRED_CHANNEL);
    this.redis.on("message", (channel, message) => void this.handleMessage(channel, message));
  }

  async onModuleDestroy(): Promise<void> {
    this.redis?.disconnect();
  }

  private async handleMessage(channel: string, message: string): Promise<void> {
    try {
      const payload: unknown = JSON.parse(message);
      if (channel === LISTING_UPDATED_CHANNEL) {
        await this.handleListingUpdated(payload as ListingUpdatedPayload);
      } else if (channel === TOKEN_TRANSFERRED_CHANNEL) {
        await this.handleTokenTransferred(payload as TokenTransferredPayload);
      }
    } catch (error) {
      // A malformed/unexpected event must never crash the subscriber —
      // it would silently stop every live GraphQL subscription until the
      // process restarts.
      this.logger.error(`failed to process "${channel}" event: ${error}`);
    }
  }

  private async handleListingUpdated(payload: ListingUpdatedPayload): Promise<void> {
    const listing = await this.listings.findByOnchainListingId(payload.onchainListingId);
    if (!listing) {
      return;
    }
    await this.pubSub.publish(LISTING_UPDATED_TOPIC, {
      listingId: listing.id,
      listing: toListingType(listing),
    });
  }

  private async handleTokenTransferred(payload: TokenTransferredPayload): Promise<void> {
    const token = await this.tokens.findByCollectionAndTokenId(payload.contractAddress, payload.tokenId);
    if (!token) {
      return;
    }
    const transfer = await this.transfers.findLatestByTokenId(token.id);
    if (!transfer) {
      return;
    }
    await this.pubSub.publish(TOKEN_TRANSFERRED_TOPIC, {
      collectionAddress: payload.contractAddress,
      tokenId: payload.tokenId,
      transfer: {
        id: transfer.id,
        from: transfer.fromAddress,
        to: transfer.toAddress,
        txHash: transfer.txHash,
        blockNumber: transfer.blockNumber,
        occurredAt: transfer.occurredAt,
      },
    });
  }
}
