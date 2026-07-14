import { MetadataAttribute } from "@app/modules/metadata/application/upload-metadata.types";

// JSON-serializable mirror of UploadMetadataInput — BullMQ persists job data
// as JSON in Redis, which can't hold a real Buffer (see bullmq-metadata-pin-retry.queue.ts).
export interface SerializedUploadMetadataInput {
  image: { bufferBase64: string; filename: string; mimeType: string };
  name: string;
  description: string;
  attributes: MetadataAttribute[];
  royaltyBps: number;
  existingImageCid?: string;
}
