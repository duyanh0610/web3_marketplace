import { ConfigService } from "@nestjs/config";
import { PinataMetadataPinningAdapter } from "@app/modules/metadata/infrastructure/pinata-metadata-pinning.adapter";
import { MetadataPinningFailedError } from "@app/modules/metadata/domain/metadata.errors";

function fakeConfigService(values: Record<string, string>): ConfigService {
  return {
    getOrThrow: (key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`missing config: ${key}`);
      }
      return value;
    },
  } as unknown as ConfigService;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("PinataMetadataPinningAdapter", () => {
  const config = () => fakeConfigService({ PINATA_API_KEY: "key", PINATA_SECRET: "secret" });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("pinJson", () => {
    it("returns the cid on a successful first attempt", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(jsonResponse(200, { IpfsHash: "meta-cid" }));
      const adapter = new PinataMetadataPinningAdapter(config());

      const result = await adapter.pinJson({ name: "test" });

      expect(result).toEqual({ cid: "meta-cid" });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("retries after transient 500s and succeeds on a later attempt", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(jsonResponse(500, { error: "server error" }))
        .mockResolvedValueOnce(jsonResponse(500, { error: "server error" }))
        .mockResolvedValueOnce(jsonResponse(200, { IpfsHash: "meta-cid" }));
      const adapter = new PinataMetadataPinningAdapter(config());

      const result = await adapter.pinJson({ name: "test" });

      expect(result).toEqual({ cid: "meta-cid" });
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it("does not retry a non-429 4xx response and fails fast", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(jsonResponse(401, { error: "not authenticated" }));
      const adapter = new PinataMetadataPinningAdapter(config());

      await expect(adapter.pinJson({ name: "test" })).rejects.toThrow(MetadataPinningFailedError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("throws MetadataPinningFailedError after exhausting all retries", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(jsonResponse(500, { error: "down" }));
      const adapter = new PinataMetadataPinningAdapter(config());

      await expect(adapter.pinJson({ name: "test" })).rejects.toThrow(MetadataPinningFailedError);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it("retries on a network-level rejection (e.g. timeout), not just HTTP error status", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockRejectedValueOnce(new Error("network timeout"))
        .mockResolvedValueOnce(jsonResponse(200, { IpfsHash: "meta-cid" }));
      const adapter = new PinataMetadataPinningAdapter(config());

      const result = await adapter.pinJson({ name: "test" });

      expect(result).toEqual({ cid: "meta-cid" });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("pinFile", () => {
    it("returns the cid for a successfully pinned file", async () => {
      jest.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse(200, { IpfsHash: "img-cid" }));
      const adapter = new PinataMetadataPinningAdapter(config());

      const result = await adapter.pinFile({
        buffer: Buffer.from("fake image bytes"),
        filename: "test.png",
        mimeType: "image/png",
      });

      expect(result).toEqual({ cid: "img-cid" });
    });
  });
});
