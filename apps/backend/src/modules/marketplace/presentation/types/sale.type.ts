import { Field, ID, ObjectType } from "@nestjs/graphql";
import { WeiScalar } from "@app/shared/presentation/scalars/wei.scalar";

@ObjectType("Sale")
export class SaleType {
  @Field(() => ID)
  id!: string;

  @Field()
  buyer!: string;

  @Field(() => WeiScalar)
  priceWei!: string;

  @Field(() => WeiScalar)
  royaltyPaidWei!: string;

  @Field(() => WeiScalar)
  feePaidWei!: string;

  @Field()
  txHash!: string;

  @Field()
  settledAt!: Date;
}
