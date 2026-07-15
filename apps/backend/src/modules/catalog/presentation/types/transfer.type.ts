import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType("Transfer")
export class TransferType {
  @Field(() => ID)
  id!: string;

  @Field()
  from!: string;

  @Field()
  to!: string;

  @Field()
  txHash!: string;

  @Field()
  blockNumber!: string;

  @Field()
  occurredAt!: Date;
}
