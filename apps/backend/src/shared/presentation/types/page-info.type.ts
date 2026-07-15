import { Field, ObjectType } from "@nestjs/graphql";

// Shared across every Relay-style connection — see docs/13-graphql-schema.md §1/§6.
@ObjectType("PageInfo")
export class PageInfoType {
  @Field()
  hasNextPage!: boolean;

  @Field({ nullable: true })
  endCursor?: string;
}
