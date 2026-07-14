import { faker } from "@faker-js/faker";
import { UploadMetadataUseCase } from "@app/modules/metadata/application/upload-metadata.use-case";
import { UploadMetadataInput } from "@app/modules/metadata/application/upload-metadata.types";
import { MetadataPinningFailedError } from "@app/modules/metadata/domain/metadata.errors";
import { FakeMetadataPinningService, FakePinStatusChecker } from "./fakes";

function buildInput(overrides?: Partial<UploadMetadataInput>): UploadMetadataInput {
  return {
    image: {
      buffer: Buffer.from(faker.lorem.paragraph()),
      filename: faker.system.fileName(),
      mimeType: "image/png",
    },
    name: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    attributes: [{ traitType: "color", value: faker.color.human() }],
    royaltyBps: faker.number.int({ min: 0, max: 10_000 }),
    ...overrides,
  };
}

describe("UploadMetadataUseCase", () => {
  it("pins the image then the metadata JSON, returning both cids and a tokenUri", async () => {
    const pinning = new FakeMetadataPinningService({ cid: "img-cid" }, { cid: "meta-cid" });
    const useCase = new UploadMetadataUseCase(pinning, new FakePinStatusChecker());

    const result = await useCase.execute(buildInput());

    expect(result).toEqual({ imageCid: "img-cid", metadataCid: "meta-cid", tokenUri: "ipfs://meta-cid" });
    expect(pinning.pinFileCalls).toHaveLength(1);
    expect(pinning.pinJsonCalls).toHaveLength(1);
  });

  it("builds OpenSea-style metadata JSON with the royaltyBps convenience field", async () => {
    const pinning = new FakeMetadataPinningService({ cid: "img-cid" }, { cid: "meta-cid" });
    const useCase = new UploadMetadataUseCase(pinning, new FakePinStatusChecker());
    const input = buildInput({
      name: "My NFT",
      description: "desc",
      attributes: [{ traitType: "power", value: "9000" }],
      royaltyBps: 250,
    });

    await useCase.execute(input);

    expect(pinning.pinJsonCalls[0]).toEqual({
      name: "My NFT",
      description: "desc",
      image: "ipfs://img-cid",
      attributes: [{ trait_type: "power", value: "9000" }],
      royaltyBps: 250,
    });
  });

  it("skips re-pinning the image when existingImageCid is confirmed already pinned", async () => {
    const pinning = new FakeMetadataPinningService({ cid: "should-not-be-used" }, { cid: "meta-cid" });
    const statusChecker = new FakePinStatusChecker(new Set(["already-pinned-cid"]));
    const useCase = new UploadMetadataUseCase(pinning, statusChecker);

    const result = await useCase.execute(buildInput(), "already-pinned-cid");

    expect(result.imageCid).toBe("already-pinned-cid");
    expect(pinning.pinFileCalls).toHaveLength(0);
  });

  it("re-pins the image when existingImageCid is not actually confirmed pinned", async () => {
    const pinning = new FakeMetadataPinningService({ cid: "fresh-cid" }, { cid: "meta-cid" });
    const useCase = new UploadMetadataUseCase(pinning, new FakePinStatusChecker());

    const result = await useCase.execute(buildInput(), "stale-cid");

    expect(result.imageCid).toBe("fresh-cid");
    expect(pinning.pinFileCalls).toHaveLength(1);
  });

  it("wraps a metadata-pin failure with the already-obtained imageCid", async () => {
    const pinning = new FakeMetadataPinningService(
      { cid: "img-cid" },
      new MetadataPinningFailedError("Pinata returned 500"),
    );
    const useCase = new UploadMetadataUseCase(pinning, new FakePinStatusChecker());

    await expect(useCase.execute(buildInput())).rejects.toMatchObject({
      code: "METADATA_PINNING_FAILED",
      partialImageCid: "img-cid",
    });
  });

  it("propagates a pinFile failure directly, with no partialImageCid", async () => {
    const pinning = new FakeMetadataPinningService(new MetadataPinningFailedError("Pinata returned 500"));
    const useCase = new UploadMetadataUseCase(pinning, new FakePinStatusChecker());

    await expect(useCase.execute(buildInput())).rejects.toMatchObject({
      code: "METADATA_PINNING_FAILED",
      partialImageCid: undefined,
    });
  });

  it("propagates a non-domain error from pinJson without wrapping", async () => {
    const genericError = new Error("boom");
    const pinning = new FakeMetadataPinningService({ cid: "img-cid" }, genericError);
    const useCase = new UploadMetadataUseCase(pinning, new FakePinStatusChecker());

    await expect(useCase.execute(buildInput())).rejects.toBe(genericError);
  });
});
