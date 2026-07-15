import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { JwtAuthGuard } from "@app/modules/auth/presentation/guards/jwt-auth.guard";
import { UploadTargetType } from "@app/modules/metadata/presentation/types/upload-target.type";

// A presigned-URL-shaped upload target (per docs/13-graphql-schema.md §4)
// doesn't actually apply to this project's upload design: Milestone 3's
// REST endpoint (POST /api/v1/metadata/upload) pins directly to Pinata in
// one authenticated multipart request — there's no separate temp-storage
// target to hand out, and no presigned URL to sign. Rather than build that
// machinery to satisfy the doc literally, this mutation returns the fixed
// REST endpoint itself as the "target", so the schema's documented
// two-step shape (prepare via GraphQL, upload bytes via REST — GraphQL
// can't carry binary multipart payloads without extra tooling this project
// doesn't have set up) is honored without duplicating Milestone 3's upload
// logic. `fileName`/`contentType` are accepted per the documented contract
// but unused by this simplified implementation; kept so a real presigned
// flow (e.g. S3) could replace this later without a breaking schema change.
const UPLOAD_TARGET_TTL_MS = 15 * 60 * 1000;

@Resolver()
export class MetadataResolver {
  @UseGuards(JwtAuthGuard)
  @Mutation(() => UploadTargetType)
  requestMetadataUpload(
    @Args("fileName") _fileName: string,
    @Args("contentType") _contentType: string,
  ): UploadTargetType {
    return {
      uploadUrl: "/api/v1/metadata/upload",
      expiresAt: new Date(Date.now() + UPLOAD_TARGET_TTL_MS),
    };
  }
}
