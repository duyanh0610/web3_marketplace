import { Module } from "@nestjs/common";
import { CatalogModule } from "@app/modules/catalog/catalog.module";
import { LISTING_REPOSITORY } from "@app/modules/marketplace/application/ports/listing-repository.port";
import { PrismaListingRepository } from "@app/modules/marketplace/infrastructure/prisma-listing.repository";
import { MarketplaceResolver } from "@app/modules/marketplace/presentation/resolvers/marketplace.resolver";
import { ListingResolver } from "@app/modules/marketplace/presentation/resolvers/listing.resolver";
import { TokenListingResolver } from "@app/modules/marketplace/presentation/resolvers/token-listing.resolver";

@Module({
  imports: [CatalogModule],
  providers: [
    MarketplaceResolver,
    ListingResolver,
    TokenListingResolver,
    { provide: LISTING_REPOSITORY, useClass: PrismaListingRepository },
  ],
  // Exported so IndexerBridgeModule can re-fetch full Listing state when a
  // listing.updated Redis event arrives (docs/05-backend-design.md §3).
  exports: [LISTING_REPOSITORY],
})
export class MarketplaceModule {}
