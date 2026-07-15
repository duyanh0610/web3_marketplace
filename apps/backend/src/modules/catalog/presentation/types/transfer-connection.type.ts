import { Field, ObjectType } from "@nestjs/graphql";
import { PageInfoType } from "@app/shared/presentation/types/page-info.type";
import { TransferType } from "@app/modules/catalog/presentation/types/transfer.type";

@ObjectType("TransferEdge")
export class TransferEdgeType {
  @Field(() => TransferType)
  node!: TransferType;

  @Field()
  cursor!: string;
}

@ObjectType("TransferConnection")
export class TransferConnectionType {
  @Field(() => [TransferEdgeType])
  edges!: TransferEdgeType[];

  @Field(() => PageInfoType)
  pageInfo!: PageInfoType;
}
