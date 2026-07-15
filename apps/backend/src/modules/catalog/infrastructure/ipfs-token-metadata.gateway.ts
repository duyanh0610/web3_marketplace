import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TokenMetadata, TokenMetadataGateway } from "@app/modules/catalog/application/ports/token-metadata-gateway.port";

// Raw shape as actually pinned by UploadMetadataUseCase (OpenSea metadata
// convention — snake_case `trait_type`, not the GraphQL type's camelCase).
interface RawPinnedMetadata {
  name: string;
  description?: string;
  image: string;
  attributes?: { trait_type: string; value: string }[];
}

function isRawPinnedMetadata(value: unknown): value is RawPinnedMetadata {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RawPinnedMetadata).name === "string" &&
    typeof (value as RawPinnedMetadata).image === "string"
  );
}

@Injectable()
export class IpfsTokenMetadataGateway implements TokenMetadataGateway {
  private readonly logger = new Logger(IpfsTokenMetadataGateway.name);
  private readonly gatewayUrl: string;

  constructor(configService: ConfigService) {
    this.gatewayUrl = configService.get<string>("IPFS_GATEWAY_URL") ?? "https://gateway.pinata.cloud/ipfs";
  }

  // Nullable, not throwing: an unpinned/unreachable/malformed CID is a
  // documented, expected state for `Token.metadata` (see
  // docs/13-graphql-schema.md §2), not a request-level error.
  async fetch(cid: string): Promise<TokenMetadata | null> {
    try {
      const response = await fetch(`${this.gatewayUrl}/${cid}`);
      if (!response.ok) {
        return null;
      }
      const raw: unknown = await response.json();
      if (!isRawPinnedMetadata(raw)) {
        return null;
      }
      return {
        name: raw.name,
        description: raw.description,
        image: raw.image,
        attributes: (raw.attributes ?? []).map((attribute) => ({
          traitType: attribute.trait_type,
          value: attribute.value,
        })),
      };
    } catch (error) {
      this.logger.warn(`failed to fetch metadata for cid=${cid}: ${error}`);
      return null;
    }
  }
}
