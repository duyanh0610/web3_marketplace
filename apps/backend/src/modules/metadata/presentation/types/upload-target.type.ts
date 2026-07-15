import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType("UploadTarget")
export class UploadTargetType {
  @Field()
  uploadUrl!: string;

  @Field()
  expiresAt!: Date;
}
