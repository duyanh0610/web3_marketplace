import { Module } from "@nestjs/common";
import { TOKEN_REPOSITORY } from "@app/modules/catalog/application/ports/token-repository.port";
import { TRANSFER_REPOSITORY } from "@app/modules/catalog/application/ports/transfer-repository.port";
import { TOKEN_METADATA_GATEWAY } from "@app/modules/catalog/application/ports/token-metadata-gateway.port";
import { PrismaTokenRepository } from "@app/modules/catalog/infrastructure/prisma-token.repository";
import { PrismaTransferRepository } from "@app/modules/catalog/infrastructure/prisma-transfer.repository";
import { IpfsTokenMetadataGateway } from "@app/modules/catalog/infrastructure/ipfs-token-metadata.gateway";
import { CatalogResolver } from "@app/modules/catalog/presentation/resolvers/catalog.resolver";
import { TokenResolver } from "@app/modules/catalog/presentation/resolvers/token.resolver";
import { TokenLoader } from "@app/modules/catalog/application/token.loader";

@Module({
  providers: [
    CatalogResolver,
    TokenResolver,
    TokenLoader,
    { provide: TOKEN_REPOSITORY, useClass: PrismaTokenRepository },
    { provide: TRANSFER_REPOSITORY, useClass: PrismaTransferRepository },
    { provide: TOKEN_METADATA_GATEWAY, useClass: IpfsTokenMetadataGateway },
  ],
  // Exported so MarketplaceModule can resolve Listing.token / add
  // Token.activeListing without re-implementing the Prisma queries itself
  // (docs/05-backend-design.md §3: Marketplace depends on Catalog).
  // TokenLoader is exported alongside the raw repository so
  // MarketplaceModule's nested resolvers get the batched (N+1-safe) path
  // for free instead of reaching for TOKEN_REPOSITORY directly.
  exports: [TOKEN_REPOSITORY, TRANSFER_REPOSITORY, TokenLoader],
})
export class CatalogModule {}
