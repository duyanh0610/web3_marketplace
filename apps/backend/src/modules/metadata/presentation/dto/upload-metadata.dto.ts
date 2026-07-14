import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from "class-validator";

export class UploadMetadataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  // JSON-encoded MetadataAttribute[] — multipart/form-data has no native
  // array/object field type. Parsed and shape-checked manually in the
  // controller (see parseAttributes) rather than via class-validator's
  // nested validation, which doesn't reliably whitelist properties on
  // objects transformed from a string field.
  @IsString()
  @IsNotEmpty()
  attributes!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  royaltyBps!: number;
}
