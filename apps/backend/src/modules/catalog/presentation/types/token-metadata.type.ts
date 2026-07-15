import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType("MetadataAttribute")
export class MetadataAttributeType {
  @Field()
  traitType!: string;

  @Field()
  value!: string;
}

@ObjectType("TokenMetadata")
export class TokenMetadataType {
  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  image!: string;

  @Field(() => [MetadataAttributeType])
  attributes!: MetadataAttributeType[];
}
