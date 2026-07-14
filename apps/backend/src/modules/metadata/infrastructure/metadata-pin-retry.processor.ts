import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { UploadMetadataUseCase } from "@app/modules/metadata/application/upload-metadata.use-case";
import { METADATA_PIN_QUEUE_NAME } from "@app/modules/metadata/infrastructure/metadata-pin-queue.constants";
import { SerializedUploadMetadataInput } from "@app/modules/metadata/infrastructure/metadata-pin-job.types";

// If this throws, BullMQ automatically schedules the next attempt per the
// job's `attempts`/`backoff` config (see bullmq-metadata-pin-retry.queue.ts)
// — no manual re-enqueue here, that would bypass BullMQ's own retry limit.
@Processor(METADATA_PIN_QUEUE_NAME)
export class MetadataPinRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(MetadataPinRetryProcessor.name);

  constructor(private readonly uploadMetadata: UploadMetadataUseCase) {
    super();
  }

  async process(job: Job<SerializedUploadMetadataInput>): Promise<void> {
    const result = await this.uploadMetadata.execute(
      {
        ...job.data,
        image: {
          buffer: Buffer.from(job.data.image.bufferBase64, "base64"),
          filename: job.data.image.filename,
          mimeType: job.data.image.mimeType,
        },
      },
      job.data.existingImageCid,
    );
    this.logger.log(`Background pin retry succeeded for job ${job.id}: ${result.tokenUri}`);
  }
}
