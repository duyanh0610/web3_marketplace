import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType("Account")
export class AccountType {
  @Field()
  address!: string;

  @Field()
  firstSeenAt!: Date;
}
