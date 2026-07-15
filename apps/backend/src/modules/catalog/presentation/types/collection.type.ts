import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType("Collection")
export class CollectionType {
  @Field(() => ID)
  id!: string;

  @Field()
  contractAddress!: string;

  @Field()
  name!: string;

  @Field()
  symbol!: string;
}
