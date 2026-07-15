// Mirrors Prisma's ListingStatus enum values exactly (see schema.prisma) —
// kept as our own union rather than importing the Prisma enum so this
// application-layer port stays framework-free.
export type ListingStatusValue = "ACTIVE" | "CANCELLED" | "SOLD";

export interface SaleRecord {
  id: string;
  buyerAddress: string;
  priceWei: string;
  royaltyPaidWei: string;
  feePaidWei: string;
  txHash: string;
  settledAt: Date;
}

export interface ListingRecord {
  id: string;
  onchainListingId: string;
  tokenId: string; // Token.id (FK) — resolved to a full Token via CatalogModule's TokenLoader
  sellerAddress: string;
  priceWei: string;
  status: ListingStatusValue;
  createdAt: Date;
  updatedAt: Date;
  sale: SaleRecord | null;
}

export interface FindListingsArgs {
  take: number;
  cursorId?: string;
  status?: ListingStatusValue;
  sellerAddress?: string;
}

export interface ListingRepository {
  findMany(args: FindListingsArgs): Promise<ListingRecord[]>;
  // Backs Token.activeListing (see marketplace.module.ts's field resolver
  // on TokenType) — a token can have at most one ACTIVE listing at a time
  // (Marketplace.sol only allows listing a token you currently own, and
  // ownership moves on sale).
  findActiveByTokenId(tokenId: string): Promise<ListingRecord | null>;
  // Backs the listingUpdated subscription (IndexerBridgeModule): the
  // Redis event only carries the onchainListingId, so this re-fetches full
  // current state (including `sale`) to publish a complete GraphQL Listing.
  findByOnchainListingId(onchainListingId: string): Promise<ListingRecord | null>;
}

export const LISTING_REPOSITORY = Symbol("LISTING_REPOSITORY");
