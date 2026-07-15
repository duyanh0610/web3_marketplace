import { Inject } from "@nestjs/common";
import { Args, Int, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import {
  TOKEN_METADATA_GATEWAY,
  TokenMetadataGateway,
} from "@app/modules/catalog/application/ports/token-metadata-gateway.port";
import { TRANSFER_REPOSITORY, TransferRepository } from "@app/modules/catalog/application/ports/transfer-repository.port";
import { TokenType } from "@app/modules/catalog/presentation/types/token.type";
import { TokenMetadataType } from "@app/modules/catalog/presentation/types/token-metadata.type";
import { TransferConnectionType } from "@app/modules/catalog/presentation/types/transfer-connection.type";
import { clampFirst, encodeCursor, paginate } from "@app/shared/presentation/relay-pagination";

@Resolver(() => TokenType)
export class TokenResolver {
  constructor(
    @Inject(TOKEN_METADATA_GATEWAY) private readonly metadataGateway: TokenMetadataGateway,
    @Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository,
  ) {}

  @ResolveField(() => TokenMetadataType, { nullable: true })
  async metadata(@Parent() token: TokenType): Promise<TokenMetadataType | null> {
    if (!token.metadataCid) {
      return null;
    }
    return this.metadataGateway.fetch(token.metadataCid);
  }

  @ResolveField("transfers", () => TransferConnectionType)
  async resolveTransfers(
    @Parent() token: TokenType,
    @Args("first", { type: () => Int, defaultValue: 20 }) first: number,
    @Args("after", { nullable: true }) after?: string,
  ): Promise<TransferConnectionType> {
    const page = await paginate((args) => this.transfers.findByTokenId(token.id, args), clampFirst(first), after);
    return {
      edges: page.items.map((item) => ({
        node: {
          id: item.id,
          from: item.fromAddress,
          to: item.toAddress,
          txHash: item.txHash,
          blockNumber: item.blockNumber,
          occurredAt: item.occurredAt,
        },
        cursor: encodeCursor(item.id),
      })),
      pageInfo: { hasNextPage: page.hasNextPage, endCursor: page.endCursor },
    };
  }
}
