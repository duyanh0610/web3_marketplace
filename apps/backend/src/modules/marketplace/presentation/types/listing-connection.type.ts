import { Field, ObjectType } from "@nestjs/graphql";
import { PageInfoType } from "@app/shared/presentation/types/page-info.type";
import { ListingType } from "@app/modules/marketplace/presentation/types/listing.type";

@ObjectType("ListingEdge")
export class ListingEdgeType {
  @Field(() => ListingType)
  node!: ListingType;

  @Field()
  cursor!: string;
}

@ObjectType("ListingConnection")
export class ListingConnectionType {
  @Field(() => [ListingEdgeType])
  edges!: ListingEdgeType[];

  @Field(() => PageInfoType)
  pageInfo!: PageInfoType;
}
