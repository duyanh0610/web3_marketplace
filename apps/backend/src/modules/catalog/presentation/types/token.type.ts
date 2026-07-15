import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { CollectionType } from "@app/modules/catalog/presentation/types/collection.type";
import { TokenMetadataType } from "@app/modules/catalog/presentation/types/token-metadata.type";
import { TransferConnectionType } from "@app/modules/catalog/presentation/types/transfer-connection.type";

@ObjectType("Token")
export class TokenType {
  @Field(() => ID)
  id!: string;

  @Field(() => CollectionType)
  collection!: CollectionType;

  @Field()
  tokenId!: string;

  @Field()
  owner!: string;

  @Field()
  tokenUri!: string;

  @Field({ nullable: true })
  metadataCid?: string;

  @Field()
  royaltyReceiver!: string;

  @Field(() => Int)
  royaltyBps!: number;

  // Resolved via @ResolveField in TokenResolver (fetches from IPFS —
  // nullable if unpinned/unreachable, see token-metadata-gateway.port.ts).
  @Field(() => TokenMetadataType, { nullable: true })
  metadata?: TokenMetadataType;

  // Resolved via @ResolveField in TokenResolver — TS-optional here (not
  // always present on the intermediate object a root query returns) even
  // though the GraphQL field itself is non-null (always populated by the
  // time a response is returned).
  @Field(() => TransferConnectionType)
  transfers?: TransferConnectionType;

  // activeListing is intentionally NOT declared here — MarketplaceModule
  // adds it via its own @Resolver(() => TokenType) field resolver, keeping
  // the Catalog→Marketplace dependency arrow pointing the documented
  // direction (docs/05-backend-design.md §3: Marketplace depends on
  // Catalog, never the reverse). activeAuction is deferred to Milestone 8
  // (no Auction contract or indexer data exists yet).
}
