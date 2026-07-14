export const METADATA_PINNING_SERVICE = Symbol("METADATA_PINNING_SERVICE");

export interface PinFileInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface MetadataPinningPort {
  pinFile(input: PinFileInput): Promise<{ cid: string }>;
  pinJson(json: Record<string, unknown>): Promise<{ cid: string }>;
}
