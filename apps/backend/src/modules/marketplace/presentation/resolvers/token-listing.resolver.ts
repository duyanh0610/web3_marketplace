import { Inject } from "@nestjs/common";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import {
  LISTING_REPOSITORY,
  ListingRepository,
} from "@app/modules/marketplace/application/ports/listing-repository.port";
import { ListingType } from "@app/modules/marketplace/presentation/types/listing.type";
import { toListingType } from "@app/modules/marketplace/presentation/mappers/listing.mapper";
import { TokenType } from "@app/modules/catalog/presentation/types/token.type";

// Adds Token.activeListing from the Marketplace side rather than declaring
// it on CatalogModule's TokenType — keeps the Catalog→Marketplace
// dependency arrow pointing the documented direction (see token.type.ts's
// comment and docs/05-backend-design.md §3).
@Resolver(() => TokenType)
export class TokenListingResolver {
  constructor(@Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository) {}

  @ResolveField("activeListing", () => ListingType, { nullable: true })
  async resolveActiveListing(@Parent() token: TokenType): Promise<ListingType | null> {
    const listing = await this.listings.findActiveByTokenId(token.id);
    return listing ? toListingType(listing) : null;
  }
}
