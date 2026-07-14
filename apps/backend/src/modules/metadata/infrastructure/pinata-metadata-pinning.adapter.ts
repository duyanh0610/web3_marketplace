import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MetadataPinningPort, PinFileInput } from "@app/modules/metadata/application/ports/metadata-pinning.port";
import { MetadataPinningFailedError } from "@app/modules/metadata/domain/metadata.errors";

const PINATA_PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

// A handful of fast, in-request retries for transient failures (network
// blips, Pinata rate-limit/downtime) — see docs/09-security-model.md and
// milestone-03's Risks table. Failures that survive these are not retried
// further here; that's the metadata-pin BullMQ queue's job (milestone task 3).
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [300, 900];

interface PinataPinResponse {
  IpfsHash: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class PinataMetadataPinningAdapter implements MetadataPinningPort {
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.getOrThrow<string>("PINATA_API_KEY");
    this.apiSecret = configService.getOrThrow<string>("PINATA_SECRET");
  }

  async pinFile(input: PinFileInput): Promise<{ cid: string }> {
    const formData = new FormData();
    // Buffer's `.buffer` is typed as ArrayBufferLike (includes
    // SharedArrayBuffer), which Blob's BlobPart type rejects — wrapping in a
    // fresh Uint8Array gives a plain ArrayBuffer-backed view instead.
    formData.append(
      "file",
      new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
      input.filename,
    );

    const result = await this.postWithRetry(PINATA_PIN_FILE_URL, formData);
    return { cid: result.IpfsHash };
  }

  async pinJson(json: Record<string, unknown>): Promise<{ cid: string }> {
    const result = await this.postWithRetry(
      PINATA_PIN_JSON_URL,
      JSON.stringify({ pinataContent: json }),
      { "Content-Type": "application/json" },
    );
    return { cid: result.IpfsHash };
  }

  private async postWithRetry(
    url: string,
    body: FormData | string,
    extraHeaders: Record<string, string> = {},
  ): Promise<PinataPinResponse> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            ...extraHeaders,
            pinata_api_key: this.apiKey,
            pinata_secret_api_key: this.apiSecret,
          },
          body,
        });

        if (response.ok) {
          return (await response.json()) as PinataPinResponse;
        }

        // A 4xx other than 429 (rate limit) means the request itself is
        // invalid (bad auth, malformed body) — retrying won't help.
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new MetadataPinningFailedError(
            `Pinata returned ${response.status}: ${await response.text()}`,
          );
        }
        lastError = new Error(`Pinata returned ${response.status}`);
      } catch (error) {
        if (error instanceof MetadataPinningFailedError) {
          throw error;
        }
        lastError = error;
      }

      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_MS[attempt - 1]);
      }
    }

    throw new MetadataPinningFailedError(
      lastError instanceof Error ? lastError.message : "unknown error",
    );
  }
}
