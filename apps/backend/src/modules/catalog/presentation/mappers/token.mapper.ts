import { TokenRecord } from "@app/modules/catalog/application/ports/token-repository.port";
import { TokenType } from "@app/modules/catalog/presentation/types/token.type";

// Shared across CatalogModule's own resolvers and MarketplaceModule's
// Listing.token/Token.activeListing field resolvers, so every module maps
// a TokenRecord to the GraphQL type the same way.
export function toTokenType(record: TokenRecord): TokenType {
  return {
    id: record.id,
    collection: record.collection,
    tokenId: record.tokenId,
    owner: record.ownerAddress,
    tokenUri: record.tokenUri,
    metadataCid: record.metadataCid ?? undefined,
    royaltyReceiver: record.royaltyReceiver,
    royaltyBps: record.royaltyBps,
  };
}
