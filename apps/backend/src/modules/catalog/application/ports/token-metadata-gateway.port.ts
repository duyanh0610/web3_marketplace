export interface TokenMetadataAttribute {
  traitType: string;
  value: string;
}

export interface TokenMetadata {
  name: string;
  description?: string;
  image: string;
  attributes: TokenMetadataAttribute[];
}

// Nullable return — a token's metadata may be unpinned yet or the IPFS
// gateway may be unreachable; docs/13-graphql-schema.md §2 documents
// `Token.metadata` as nullable for exactly this reason, not as an error case.
export interface TokenMetadataGateway {
  fetch(cid: string): Promise<TokenMetadata | null>;
}

export const TOKEN_METADATA_GATEWAY = Symbol("TOKEN_METADATA_GATEWAY");
