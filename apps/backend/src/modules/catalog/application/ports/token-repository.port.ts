export interface CollectionRecord {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
}

export interface TokenRecord {
  id: string;
  collection: CollectionRecord;
  tokenId: string; // stringified bigint — see docs/13-graphql-schema.md §1
  ownerAddress: string;
  tokenUri: string;
  // Set later by the metadata-pin flow (Milestone 3), so genuinely absent
  // for a freshly-indexed, not-yet-pinned token — unlike royaltyReceiver/Bps
  // below, this one really can be null.
  metadataCid: string | null;
  // The indexer always sets these at mint time (see
  // apps/indexer/src/apply/apply-transfer.ts's createTokenFromMint) even
  // though Prisma's column is nullable — non-null here reflects that real
  // invariant rather than the column's own nullability.
  royaltyReceiver: string;
  royaltyBps: number;
}

export interface TokenRepository {
  findByCollectionAndTokenId(contractAddress: string, tokenId: string): Promise<TokenRecord | null>;
  findOwnedBy(address: string, args: { take: number; cursorId?: string }): Promise<TokenRecord[]>;
  // Batch lookup by Token.id (Prisma's internal id, not onchain tokenId) —
  // exists specifically so TokenLoader can batch Listing.token/Sale-adjacent
  // lookups into one query instead of one-per-row (see docs/05-backend-design.md's
  // Milestone 6 N+1 risk note). Order of the result is not guaranteed to
  // match `ids`; callers must re-index by id themselves.
  findByIds(ids: string[]): Promise<TokenRecord[]>;
}

export const TOKEN_REPOSITORY = Symbol("TOKEN_REPOSITORY");
