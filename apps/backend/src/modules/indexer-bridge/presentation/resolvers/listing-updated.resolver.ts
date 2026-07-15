import { Inject } from "@nestjs/common";
import { Args, ID, Resolver, Subscription } from "@nestjs/graphql";
import { PubSub } from "graphql-subscriptions";
import { ListingType } from "@app/modules/marketplace/presentation/types/listing.type";
import { PUB_SUB, LISTING_UPDATED_TOPIC } from "@app/modules/indexer-bridge/application/pub-sub.provider";

interface ListingUpdatedEvent {
  listingId: string;
  listing: ListingType;
}

@Resolver()
export class ListingUpdatedResolver {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub) {}

  @Subscription(() => ListingType, {
    filter: (payload: ListingUpdatedEvent, variables: { listingId?: string }) =>
      !variables.listingId || payload.listingId === variables.listingId,
    resolve: (payload: ListingUpdatedEvent) => payload.listing,
  })
  listingUpdated(@Args("listingId", { type: () => ID, nullable: true }) _listingId?: string) {
    return this.pubSub.asyncIterableIterator(LISTING_UPDATED_TOPIC);
  }
}
