import { BadRequestException } from "@nestjs/common";
import { faker } from "@faker-js/faker";
import { MetadataController } from "@app/modules/metadata/presentation/controllers/metadata.controller";
import { UploadMetadataUseCase } from "@app/modules/metadata/application/upload-metadata.use-case";
import { UploadMetadataDto } from "@app/modules/metadata/presentation/dto/upload-metadata.dto";
import { MetadataPinningFailedError } from "@app/modules/metadata/domain/metadata.errors";
import {
  FakeMetadataPinningService,
  FakeMetadataPinRetryQueue,
  FakePinStatusChecker,
} from "../application/fakes";

function fakeImage(): Express.Multer.File {
  return {
    buffer: Buffer.from(faker.lorem.paragraph()),
    originalname: faker.system.fileName(),
    mimetype: "image/png",
  } as Express.Multer.File;
}

function fakeDto(overrides?: Partial<UploadMetadataDto>): UploadMetadataDto {
  const dto = new UploadMetadataDto();
  dto.name = faker.commerce.productName();
  dto.description = faker.lorem.sentence();
  dto.attributes = JSON.stringify([{ traitType: "color", value: "red" }]);
  dto.royaltyBps = 500;
  return Object.assign(dto, overrides);
}

describe("MetadataController", () => {
  function setup(pinning = new FakeMetadataPinningService()) {
    const useCase = new UploadMetadataUseCase(pinning, new FakePinStatusChecker());
    const retryQueue = new FakeMetadataPinRetryQueue();
    const controller = new MetadataController(useCase, retryQueue);
    return { controller, retryQueue, pinning };
  }

  it("uploads successfully and returns the pinned cids/tokenUri", async () => {
    const { controller } = setup(new FakeMetadataPinningService({ cid: "img-cid" }, { cid: "meta-cid" }));

    const result = await controller.upload(fakeImage(), fakeDto());

    expect(result).toEqual({ imageCid: "img-cid", metadataCid: "meta-cid", tokenUri: "ipfs://meta-cid" });
  });

  it("rejects malformed JSON in the attributes field", async () => {
    const { controller } = setup();

    await expect(controller.upload(fakeImage(), fakeDto({ attributes: "not-json" }))).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejects attributes that aren't an array", async () => {
    const { controller } = setup();

    await expect(
      controller.upload(fakeImage(), fakeDto({ attributes: JSON.stringify({ traitType: "x", value: "y" }) })),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects attribute items missing traitType or value", async () => {
    const { controller } = setup();

    await expect(
      controller.upload(fakeImage(), fakeDto({ attributes: JSON.stringify([{ foo: "bar" }]) })),
    ).rejects.toThrow(BadRequestException);
  });

  it("enqueues a background retry job (with the partial imageCid) and rethrows on pinning failure", async () => {
    const pinning = new FakeMetadataPinningService(
      { cid: "img-cid" },
      new MetadataPinningFailedError("Pinata returned 500"),
    );
    const { controller, retryQueue } = setup(pinning);

    await expect(controller.upload(fakeImage(), fakeDto())).rejects.toThrow(MetadataPinningFailedError);

    expect(retryQueue.enqueued).toHaveLength(1);
    expect(retryQueue.enqueued[0].existingImageCid).toBe("img-cid");
  });

  it("does not enqueue a retry job for a non-pinning error", async () => {
    const pinning = new FakeMetadataPinningService({ cid: "img-cid" }, new Error("unexpected"));
    const { controller, retryQueue } = setup(pinning);

    await expect(controller.upload(fakeImage(), fakeDto())).rejects.toThrow("unexpected");

    expect(retryQueue.enqueued).toHaveLength(0);
  });
});
