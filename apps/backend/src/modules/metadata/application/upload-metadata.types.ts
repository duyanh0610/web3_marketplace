import { PinFileInput } from "@app/modules/metadata/application/ports/metadata-pinning.port";

export interface MetadataAttribute {
  traitType: string;
  value: string;
}

export interface UploadMetadataInput {
  image: PinFileInput;
  name: string;
  description: string;
  attributes: MetadataAttribute[];
  royaltyBps: number;
}

export interface UploadMetadataResult {
  imageCid: string;
  metadataCid: string;
  tokenUri: string;
}
