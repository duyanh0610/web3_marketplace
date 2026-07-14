import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  Inject,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "@app/modules/auth/presentation/guards/jwt-auth.guard";
import {
  METADATA_PIN_RETRY_QUEUE,
  MetadataPinRetryQueuePort,
} from "@app/modules/metadata/application/ports/metadata-pin-retry-queue.port";
import { UploadMetadataUseCase } from "@app/modules/metadata/application/upload-metadata.use-case";
import { MetadataAttribute, UploadMetadataInput } from "@app/modules/metadata/application/upload-metadata.types";
import { MetadataPinningFailedError } from "@app/modules/metadata/domain/metadata.errors";
import { UploadMetadataDto } from "@app/modules/metadata/presentation/dto/upload-metadata.dto";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /^image\/(png|jpe?g|gif|webp)$/;

function isMetadataAttribute(value: unknown): value is MetadataAttribute {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).traitType === "string" &&
    typeof (value as Record<string, unknown>).value === "string"
  );
}

function parseAttributes(raw: string): MetadataAttribute[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException("attributes must be valid JSON");
  }
  if (!Array.isArray(parsed) || !parsed.every(isMetadataAttribute)) {
    throw new BadRequestException("attributes must be an array of { traitType, value } objects");
  }
  return parsed;
}

@Controller("metadata")
export class MetadataController {
  constructor(
    private readonly uploadMetadata: UploadMetadataUseCase,
    @Inject(METADATA_PIN_RETRY_QUEUE) private readonly retryQueue: MetadataPinRetryQueuePort,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("upload")
  @UseInterceptors(FileInterceptor("image"))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES }),
          new FileTypeValidator({ fileType: ALLOWED_IMAGE_TYPES }),
        ],
      }),
    )
    image: Express.Multer.File,
    @Body() dto: UploadMetadataDto,
  ) {
    const input: UploadMetadataInput = {
      image: { buffer: image.buffer, filename: image.originalname, mimeType: image.mimetype },
      name: dto.name,
      description: dto.description,
      attributes: parseAttributes(dto.attributes),
      royaltyBps: dto.royaltyBps,
    };

    try {
      return await this.uploadMetadata.execute(input);
    } catch (error) {
      // The adapter already retried a few times fast (see
      // PinataMetadataPinningAdapter) — this is a genuine, sustained
      // failure. Rather than lose the upload, queue it for background
      // retry-with-backoff while still surfacing a clear error now.
      if (error instanceof MetadataPinningFailedError) {
        await this.retryQueue.enqueue(input, error.partialImageCid);
      }
      throw error;
    }
  }
}
