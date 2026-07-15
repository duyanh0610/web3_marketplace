import { Prisma } from "@prisma/client";
import { ListedEvent } from "../decode/types";
import { ProjectionMessage, toListingUpdatedMessage } from "./messages";

// Idempotent: keyed on the on-chain listingId (unique) — re-applying the
// same Listed event again is a no-op update, never a duplicate row.
export async function applyListed(tx: Prisma.TransactionClient, event: ListedEvent): Promise<ProjectionMessage> {
  const collection = await tx.collection.findUniqueOrThrow({ where: { contractAddress: event.nft } });
  const token = await tx.token.findUniqueOrThrow({
    where: { collectionId_tokenId: { collectionId: collection.id, tokenId: event.tokenId } },
  });

  const listing = await tx.listing.upsert({
    where: { onchainListingId: event.listingId },
    create: {
      onchainListingId: event.listingId,
      tokenId: token.id,
      sellerAddress: event.seller,
      priceWei: event.price.toString(),
      status: "ACTIVE",
      listedAtBlock: event.blockNumber,
      lastEventBlock: event.blockNumber,
    },
    update: {},
  });

  return toListingUpdatedMessage(listing);
}
