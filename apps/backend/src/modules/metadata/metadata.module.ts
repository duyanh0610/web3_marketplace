import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { METADATA_PIN_RETRY_QUEUE } from "@app/modules/metadata/application/ports/metadata-pin-retry-queue.port";
import { METADATA_PINNING_SERVICE } from "@app/modules/metadata/application/ports/metadata-pinning.port";
import { PIN_STATUS_CHECKER } from "@app/modules/metadata/application/ports/pin-status-checker.port";
import { UploadMetadataUseCase } from "@app/modules/metadata/application/upload-metadata.use-case";
import { BullMqMetadataPinRetryQueue } from "@app/modules/metadata/infrastructure/bullmq-metadata-pin-retry.queue";
import { METADATA_PIN_QUEUE_NAME } from "@app/modules/metadata/infrastructure/metadata-pin-queue.constants";
import { MetadataPinRetryProcessor } from "@app/modules/metadata/infrastructure/metadata-pin-retry.processor";
import { PinataMetadataPinningAdapter } from "@app/modules/metadata/infrastructure/pinata-metadata-pinning.adapter";
import { PinataPinStatusChecker } from "@app/modules/metadata/infrastructure/pinata-pin-status.checker";
import { MetadataController } from "@app/modules/metadata/presentation/controllers/metadata.controller";
import { MetadataResolver } from "@app/modules/metadata/presentation/resolvers/metadata.resolver";

@Module({
  imports: [BullModule.registerQueue({ name: METADATA_PIN_QUEUE_NAME })],
  controllers: [MetadataController],
  providers: [
    UploadMetadataUseCase,
    MetadataPinRetryProcessor,
    MetadataResolver,
    { provide: METADATA_PINNING_SERVICE, useClass: PinataMetadataPinningAdapter },
    { provide: METADATA_PIN_RETRY_QUEUE, useClass: BullMqMetadataPinRetryQueue },
    { provide: PIN_STATUS_CHECKER, useClass: PinataPinStatusChecker },
  ],
})
export class MetadataModule {}
