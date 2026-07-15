import { NotFoundException } from "@nestjs/common";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { TokenLoader } from "@app/modules/catalog/application/token.loader";
import { TokenType } from "@app/modules/catalog/presentation/types/token.type";
import { toTokenType } from "@app/modules/catalog/presentation/mappers/token.mapper";
import { ListingType } from "@app/modules/marketplace/presentation/types/listing.type";

@Resolver(() => ListingType)
export class ListingResolver {
  constructor(private readonly tokenLoader: TokenLoader) {}

  @ResolveField("token", () => TokenType)
  async resolveToken(@Parent() listing: ListingType): Promise<TokenType> {
    const token = await this.tokenLoader.load(listing.tokenId);
    if (!token) {
      throw new NotFoundException(`token ${listing.tokenId} referenced by listing ${listing.id} not found`);
    }
    return toTokenType(token);
  }
}
