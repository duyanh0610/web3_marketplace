import { Inject } from "@nestjs/common";
import { Args, Int, Query, Resolver } from "@nestjs/graphql";
import {
  LISTING_REPOSITORY,
  ListingRepository,
} from "@app/modules/marketplace/application/ports/listing-repository.port";
import { ListingConnectionType } from "@app/modules/marketplace/presentation/types/listing-connection.type";
import { ListingStatusEnum } from "@app/modules/marketplace/presentation/types/listing-status.enum";
import { toListingType } from "@app/modules/marketplace/presentation/mappers/listing.mapper";
import { clampFirst, encodeCursor, paginate } from "@app/shared/presentation/relay-pagination";

@Resolver()
export class MarketplaceResolver {
  constructor(@Inject(LISTING_REPOSITORY) private readonly listingRepository: ListingRepository) {}

  @Query(() => ListingConnectionType)
  async listings(
    @Args("first", { type: () => Int, defaultValue: 20 }) first: number,
    @Args("after", { nullable: true }) after?: string,
    @Args("status", { type: () => ListingStatusEnum, defaultValue: ListingStatusEnum.ACTIVE })
    status?: ListingStatusEnum,
    @Args("sellerAddress", { nullable: true }) sellerAddress?: string,
  ): Promise<ListingConnectionType> {
    const page = await paginate(
      (args) =>
        this.listingRepository.findMany({
          ...args,
          status,
          sellerAddress: sellerAddress?.toLowerCase(),
        }),
      clampFirst(first),
      after,
    );
    return {
      edges: page.items.map((item) => ({ node: toListingType(item), cursor: encodeCursor(item.id) })),
      pageInfo: { hasNextPage: page.hasNextPage, endCursor: page.endCursor },
    };
  }
}
