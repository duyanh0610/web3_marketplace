import {
  MetadataPinningPort,
  PinFileInput,
} from "@app/modules/metadata/application/ports/metadata-pinning.port";
import { PinStatusCheckerPort } from "@app/modules/metadata/application/ports/pin-status-checker.port";
import { MetadataPinRetryQueuePort } from "@app/modules/metadata/application/ports/metadata-pin-retry-queue.port";
import { UploadMetadataInput } from "@app/modules/metadata/application/upload-metadata.types";

// In-memory test doubles for the metadata module's ports — same convention
// as test/unit/modules/auth/application/fakes.ts (see docs/10-testing-strategy.md §3).

export class FakeMetadataPinningService implements MetadataPinningPort {
  pinFileCalls: PinFileInput[] = [];
  pinJsonCalls: Record<string, unknown>[] = [];

  constructor(
    private readonly pinFileResult: { cid: string } | Error = { cid: "fake-image-cid" },
    private readonly pinJsonResult: { cid: string } | Error = { cid: "fake-metadata-cid" },
  ) {}

  async pinFile(input: PinFileInput): Promise<{ cid: string }> {
    this.pinFileCalls.push(input);
    if (this.pinFileResult instanceof Error) {
      throw this.pinFileResult;
    }
    return this.pinFileResult;
  }

  async pinJson(json: Record<string, unknown>): Promise<{ cid: string }> {
    this.pinJsonCalls.push(json);
    if (this.pinJsonResult instanceof Error) {
      throw this.pinJsonResult;
    }
    return this.pinJsonResult;
  }
}

export class FakePinStatusChecker implements PinStatusCheckerPort {
  constructor(private readonly pinnedCids: ReadonlySet<string> = new Set()) {}

  async isPinned(cid: string): Promise<boolean> {
    return this.pinnedCids.has(cid);
  }
}

export class FakeMetadataPinRetryQueue implements MetadataPinRetryQueuePort {
  enqueued: { input: UploadMetadataInput; existingImageCid?: string }[] = [];

  async enqueue(input: UploadMetadataInput, existingImageCid?: string): Promise<void> {
    this.enqueued.push({ input, existingImageCid });
  }
}
