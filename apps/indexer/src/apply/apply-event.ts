import { Prisma } from "@prisma/client";
import { DecodedEvent } from "../decode/types";
import { ChainReaderPort } from "../chain/chain-reader.port";
import { ProjectionMessage } from "./messages";
import { applyTransfer } from "./apply-transfer";
import { applyListed } from "./apply-listed";
import { applyCancelled } from "./apply-cancelled";
import { applySold } from "./apply-sold";

export async function applyEvent(
  tx: Prisma.TransactionClient,
  chainReader: ChainReaderPort,
  event: DecodedEvent,
): Promise<ProjectionMessage | null> {
  switch (event.eventName) {
    case "Transfer":
      return applyTransfer(tx, chainReader, event);
    case "Listed":
      return applyListed(tx, event);
    case "Cancelled":
      return applyCancelled(tx, event);
    case "Sold":
      return applySold(tx, event);
  }
}
