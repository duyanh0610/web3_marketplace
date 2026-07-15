import { Inject } from "@nestjs/common";
import { Args, Int, Query, Resolver } from "@nestjs/graphql";
import { TOKEN_REPOSITORY, TokenRepository } from "@app/modules/catalog/application/ports/token-repository.port";
import { TokenType } from "@app/modules/catalog/presentation/types/token.type";
import { TokenConnectionType } from "@app/modules/catalog/presentation/types/token-connection.type";
import { toTokenType } from "@app/modules/catalog/presentation/mappers/token.mapper";
import { clampFirst, encodeCursor, paginate } from "@app/shared/presentation/relay-pagination";

@Resolver()
export class CatalogResolver {
  constructor(@Inject(TOKEN_REPOSITORY) private readonly tokens: TokenRepository) {}

  @Query(() => TokenType, { nullable: true })
  async token(
    @Args("collectionAddress") collectionAddress: string,
    @Args("tokenId") tokenId: string,
  ): Promise<TokenType | null> {
    const record = await this.tokens.findByCollectionAndTokenId(collectionAddress.toLowerCase(), tokenId);
    return record ? toTokenType(record) : null;
  }

  @Query(() => TokenConnectionType)
  async tokensOwnedBy(
    @Args("address") address: string,
    @Args("first", { type: () => Int, defaultValue: 20 }) first: number,
    @Args("after", { nullable: true }) after?: string,
  ): Promise<TokenConnectionType> {
    const page = await paginate(
      (args) => this.tokens.findOwnedBy(address.toLowerCase(), args),
      clampFirst(first),
      after,
    );
    return {
      edges: page.items.map((item) => ({ node: toTokenType(item), cursor: encodeCursor(item.id) })),
      pageInfo: { hasNextPage: page.hasNextPage, endCursor: page.endCursor },
    };
  }
}
