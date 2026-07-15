import { Module } from "@nestjs/common";
import { CatalogModule } from "@app/modules/catalog/catalog.module";
import { MarketplaceModule } from "@app/modules/marketplace/marketplace.module";
import { pubSubProvider } from "@app/modules/indexer-bridge/application/pub-sub.provider";
import { RedisSubscriberService } from "@app/modules/indexer-bridge/application/redis-subscriber.service";
import { ListingUpdatedResolver } from "@app/modules/indexer-bridge/presentation/resolvers/listing-updated.resolver";
import { TokenTransferredResolver } from "@app/modules/indexer-bridge/presentation/resolvers/token-transferred.resolver";

// Consumer-only, per docs/05-backend-design.md §3: reads from
// Catalog/Marketplace's repositories to re-hydrate full state for each
// Redis event, but nothing in either of those modules calls back into this
// one.
@Module({
  imports: [CatalogModule, MarketplaceModule],
  providers: [pubSubProvider, RedisSubscriberService, ListingUpdatedResolver, TokenTransferredResolver],
})
export class IndexerBridgeModule {}
