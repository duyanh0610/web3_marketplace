import { UploadMetadataInput } from "@app/modules/metadata/application/upload-metadata.types";

export const METADATA_PIN_RETRY_QUEUE = Symbol("METADATA_PIN_RETRY_QUEUE");

// Fire-and-forget: schedules a background retry (with backoff, surviving a
// process restart) after the in-request pin attempt (PinataMetadataPinningAdapter's
// own fast retries) has been exhausted. See docs/05-backend-design.md §7.
export interface MetadataPinRetryQueuePort {
  enqueue(input: UploadMetadataInput, existingImageCid?: string): Promise<void>;
}
