import { Scalar, CustomScalar } from "@nestjs/graphql";
import { GraphQLError, Kind, ValueNode } from "graphql";

// String-encoded uint256 wei amount — kept as a string end-to-end (never a
// GraphQL Int/Float) to avoid JS number precision loss on large token
// amounts, per docs/13-graphql-schema.md §1. Registered as an AppModule
// provider (see app.module.ts); every Wei field must be declared explicitly
// as `@Field(() => WeiScalar)` (never left to implicit type inference) —
// the type function below deliberately points at this class itself, not
// at the native `String`, since pointing it at `String` would silently
// remap NestJS's *default* mapping for every plain `string` field in the
// whole schema to Wei instead of the built-in GraphQL String (this
// actually happened once — every string field app-wide, including
// AuthModule's, turned into `Wei` in the generated SDL).
@Scalar("Wei", () => WeiScalar)
export class WeiScalar implements CustomScalar<string, string> {
  description = "String-encoded uint256 wei amount";

  parseValue(value: unknown): string {
    return this.validate(value);
  }

  serialize(value: unknown): string {
    return this.validate(value);
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError("Wei must be a string");
    }
    return this.validate(ast.value);
  }

  private validate(value: unknown): string {
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
      throw new GraphQLError("Wei must be a numeric string");
    }
    return value;
  }
}
