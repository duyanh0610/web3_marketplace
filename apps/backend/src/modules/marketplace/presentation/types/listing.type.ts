import { Field, ID, ObjectType } from "@nestjs/graphql";
import { TokenType } from "@app/modules/catalog/presentation/types/token.type";
import { WeiScalar } from "@app/shared/presentation/scalars/wei.scalar";
import { SaleType } from "@app/modules/marketplace/presentation/types/sale.type";
import { ListingStatusEnum } from "@app/modules/marketplace/presentation/types/listing-status.enum";

@ObjectType("Listing")
export class ListingType {
  @Field(() => ID)
  id!: string;

  @Field()
  onchainListingId!: string;

  // Not a GraphQL field (no @Field()) — carried on the parent object purely
  // so ListingResolver's `token` field resolver knows which Token.id to
  // look up via TokenLoader, without a second query to re-derive it.
  tokenId!: string;

  // Resolved via @ResolveField in ListingResolver (batched through
  // CatalogModule's TokenLoader — see docs/05-backend-design.md's N+1 risk
  // note). TS-optional here for the same reason as Token.metadata/transfers.
  @Field(() => TokenType)
  token?: TokenType;

  @Field()
  seller!: string;

  @Field(() => WeiScalar)
  priceWei!: string;

  @Field(() => ListingStatusEnum)
  status!: ListingStatusEnum;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => SaleType, { nullable: true })
  sale?: SaleType;
}
