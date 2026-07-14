import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { MetadataPinRetryQueuePort } from "@app/modules/metadata/application/ports/metadata-pin-retry-queue.port";
import { UploadMetadataInput } from "@app/modules/metadata/application/upload-metadata.types";
import { METADATA_PIN_QUEUE_NAME } from "@app/modules/metadata/infrastructure/metadata-pin-queue.constants";
import { SerializedUploadMetadataInput } from "@app/modules/metadata/infrastructure/metadata-pin-job.types";

@Injectable()
export class BullMqMetadataPinRetryQueue implements MetadataPinRetryQueuePort {
  constructor(
    @InjectQueue(METADATA_PIN_QUEUE_NAME)
    private readonly queue: Queue<SerializedUploadMetadataInput>,
  ) {}

  async enqueue(input: UploadMetadataInput, existingImageCid?: string): Promise<void> {
    // BullMQ job data is JSON-serialized in Redis — a Buffer would survive
    // as a plain `{ type: "Buffer", data: number[] }` object, not a real
    // Buffer, so it's base64-encoded here and decoded back in the processor.
    await this.queue.add(
      "pin",
      {
        ...input,
        image: {
          bufferBase64: input.image.buffer.toString("base64"),
          filename: input.image.filename,
          mimeType: input.image.mimeType,
        },
        existingImageCid,
      },
      { attempts: 5, backoff: { type: "exponential", delay: 5_000 } },
    );
  }
}
