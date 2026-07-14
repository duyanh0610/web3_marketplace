import { Inject, Injectable } from "@nestjs/common";
import {
  METADATA_PINNING_SERVICE,
  MetadataPinningPort,
} from "@app/modules/metadata/application/ports/metadata-pinning.port";
import {
  PIN_STATUS_CHECKER,
  PinStatusCheckerPort,
} from "@app/modules/metadata/application/ports/pin-status-checker.port";
import {
  UploadMetadataInput,
  UploadMetadataResult,
} from "@app/modules/metadata/application/upload-metadata.types";
import { MetadataPinningFailedError } from "@app/modules/metadata/domain/metadata.errors";

@Injectable()
export class UploadMetadataUseCase {
  constructor(
    @Inject(METADATA_PINNING_SERVICE) private readonly pinningService: MetadataPinningPort,
    @Inject(PIN_STATUS_CHECKER) private readonly pinStatusChecker: PinStatusCheckerPort,
  ) {}

  // `existingImageCid` lets a retry (see MetadataPinRetryProcessor) skip
  // re-uploading the image when a previous attempt already pinned it and
  // only the metadata JSON pin failed afterwards.
  async execute(input: UploadMetadataInput, existingImageCid?: string): Promise<UploadMetadataResult> {
    const imageCid =
      existingImageCid && (await this.pinStatusChecker.isPinned(existingImageCid))
        ? existingImageCid
        : (await this.pinningService.pinFile(input.image)).cid;

    let metadataCid: string;
    try {
      // OpenSea metadata standard (name/description/image/attributes)
      // extended with royaltyBps for indexer/UI convenience — the on-chain
      // EIP-2981 call remains the source of truth for actual royalty
      // enforcement, per docs/02-business-requirements.md §F3.
      ({ cid: metadataCid } = await this.pinningService.pinJson({
        name: input.name,
        description: input.description,
        image: `ipfs://${imageCid}`,
        attributes: input.attributes.map((attribute) => ({
          trait_type: attribute.traitType,
          value: attribute.value,
        })),
        royaltyBps: input.royaltyBps,
      }));
    } catch (error) {
      if (error instanceof MetadataPinningFailedError) {
        throw new MetadataPinningFailedError(error.reason, imageCid);
      }
      throw error;
    }

    return { imageCid, metadataCid, tokenUri: `ipfs://${metadataCid}` };
  }
}
