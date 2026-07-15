import { Field, ObjectType } from "@nestjs/graphql";
import { PageInfoType } from "@app/shared/presentation/types/page-info.type";
import { TokenType } from "@app/modules/catalog/presentation/types/token.type";

@ObjectType("TokenEdge")
export class TokenEdgeType {
  @Field(() => TokenType)
  node!: TokenType;

  @Field()
  cursor!: string;
}

@ObjectType("TokenConnection")
export class TokenConnectionType {
  @Field(() => [TokenEdgeType])
  edges!: TokenEdgeType[];

  @Field(() => PageInfoType)
  pageInfo!: PageInfoType;
}
