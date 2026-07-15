import { Inject } from "@nestjs/common";
import { Args, Resolver, Subscription } from "@nestjs/graphql";
import { PubSub } from "graphql-subscriptions";
import { TransferType } from "@app/modules/catalog/presentation/types/transfer.type";
import { PUB_SUB, TOKEN_TRANSFERRED_TOPIC } from "@app/modules/indexer-bridge/application/pub-sub.provider";

interface TokenTransferredEvent {
  collectionAddress: string;
  tokenId: string;
  transfer: TransferType;
}

@Resolver()
export class TokenTransferredResolver {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub) {}

  @Subscription(() => TransferType, {
    filter: (
      payload: TokenTransferredEvent,
      variables: { collectionAddress: string; tokenId: string },
    ) =>
      payload.collectionAddress === variables.collectionAddress.toLowerCase() &&
      payload.tokenId === variables.tokenId,
    resolve: (payload: TokenTransferredEvent) => payload.transfer,
  })
  tokenTransferred(
    @Args("collectionAddress") _collectionAddress: string,
    @Args("tokenId") _tokenId: string,
  ) {
    return this.pubSub.asyncIterableIterator(TOKEN_TRANSFERRED_TOPIC);
  }
}
