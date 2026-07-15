import { Prisma } from "@prisma/client";
import { SoldEvent } from "../decode/types";
import { ProjectionMessage, toListingUpdatedMessage } from "./messages";

// Idempotent: only transitions a listing that's still ACTIVE, and the Sale
// row is upserted keyed on listingId — re-applying the same Sold event is a
// safe no-op either way, always publishing the listing's actual current
// state rather than assuming the transition took effect.
//
// feeAmount/royaltyAmount/royaltyReceiver come directly from the event
// (Marketplace.sol emits them alongside price) rather than being
// recomputed here — see docs/08-blockchain-indexer.md §6. An earlier
// version of this handler recomputed the split from the *current* feeBps,
// which would have drifted from the historical value on a rebuild-from-chain
// if feeBps was ever changed; emitting the real values on-chain removes
// that whole class of bug.
export async function applySold(tx: Prisma.TransactionClient, event: SoldEvent): Promise<ProjectionMessage | null> {
  const listing = await tx.listing.findUnique({ where: { onchainListingId: event.listingId } });
  if (!listing) {
    return null;
  }
  if (listing.status !== "ACTIVE") {
    return toListingUpdatedMessage(listing);
  }

  const updated = await tx.listing.update({
    where: { id: listing.id },
    data: { status: "SOLD", lastEventBlock: event.blockNumber },
  });

  await tx.sale.upsert({
    where: { listingId: listing.id },
    create: {
      listingId: listing.id,
      buyerAddress: event.buyer,
      priceWei: event.price.toString(),
      royaltyPaidWei: event.royaltyAmount.toString(),
      feePaidWei: event.feeAmount.toString(),
      txHash: event.txHash,
      blockNumber: event.blockNumber,
    },
    update: {},
  });

  return toListingUpdatedMessage(updated);
}
