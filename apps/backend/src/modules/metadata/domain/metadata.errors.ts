import { DomainError } from "@app/shared/domain/domain-error";

export class MetadataPinningFailedError extends DomainError {
  readonly code = "METADATA_PINNING_FAILED";

  // Set when the image pin succeeded but the metadata JSON pin failed
  // afterwards — lets a retry skip re-uploading the (already pinned) image.
  constructor(
    readonly reason: string,
    readonly partialImageCid?: string,
  ) {
    super(`Failed to pin content to IPFS: ${reason}`);
  }
}
