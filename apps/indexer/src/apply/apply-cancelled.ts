import { Prisma } from "@prisma/client";
import { CancelledEvent } from "../decode/types";
import { ProjectionMessage, toListingUpdatedMessage } from "./messages";

// Idempotent: only transitions a listing that's still ACTIVE — re-applying
// the same Cancelled event (or one that arrives after the listing was
// somehow already resolved) is a safe no-op, always publishing the listing's
// actual current state rather than assuming the transition took effect.
export async function applyCancelled(
  tx: Prisma.TransactionClient,
  event: CancelledEvent,
): Promise<ProjectionMessage | null> {
  const listing = await tx.listing.findUnique({ where: { onchainListingId: event.listingId } });
  if (!listing) {
    return null;
  }

  if (listing.status !== "ACTIVE") {
    return toListingUpdatedMessage(listing);
  }

  const updated = await tx.listing.update({
    where: { id: listing.id },
    data: { status: "CANCELLED", lastEventBlock: event.blockNumber },
  });
  return toListingUpdatedMessage(updated);
}
