import { Prisma } from "@prisma/client";

// Payload shapes are plain JSON (bigint/Decimal already stringified) since
// these cross a real serialization boundary (Redis pub/sub) — see
// docs/08-blockchain-indexer.md §7.

export interface TokenTransferredPayload {
  tokenId: string;
  contractAddress: string;
  ownerAddress: string;
}

export interface ListingUpdatedPayload {
  onchainListingId: string;
  status: string;
  tokenId: string;
  sellerAddress: string;
  priceWei: string;
}

export type ProjectionMessage =
  | { channel: "token.transferred"; payload: TokenTransferredPayload }
  | { channel: "listing.updated"; payload: ListingUpdatedPayload };

export function toTokenTransferredMessage(
  contractAddress: string,
  token: { tokenId: bigint; ownerAddress: string },
): ProjectionMessage {
  return {
    channel: "token.transferred",
    payload: {
      tokenId: token.tokenId.toString(),
      contractAddress,
      ownerAddress: token.ownerAddress,
    },
  };
}

export function toListingUpdatedMessage(listing: {
  onchainListingId: bigint;
  status: string;
  tokenId: string;
  sellerAddress: string;
  priceWei: Prisma.Decimal;
}): ProjectionMessage {
  return {
    channel: "listing.updated",
    payload: {
      onchainListingId: listing.onchainListingId.toString(),
      status: listing.status,
      tokenId: listing.tokenId,
      sellerAddress: listing.sellerAddress,
      priceWei: listing.priceWei.toString(),
    },
  };
}
