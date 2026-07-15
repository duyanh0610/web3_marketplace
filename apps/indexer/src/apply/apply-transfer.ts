import { Prisma } from "@prisma/client";
import { TransferEvent, ZERO_ADDRESS } from "../decode/types";
import { ChainReaderPort } from "../chain/chain-reader.port";
import { ProjectionMessage, toTokenTransferredMessage } from "./messages";

// Idempotency: the Transfer row's natural key is (txHash, logIndex) — the
// same log re-applied (retry, or reorg replay) upserts to the same row
// instead of inserting a duplicate.
//
// Ordering assumption: callers apply events in ascending (blockNumber,
// logIndex) order (guaranteed by backfill/live/reorg-replay all processing
// logs sequentially) — Token.ownerAddress is set unconditionally to `to`
// rather than guarded against "is this newer than what's stored", since an
// out-of-order apply should never happen given that guarantee.
export async function applyTransfer(
  tx: Prisma.TransactionClient,
  chainReader: ChainReaderPort,
  event: TransferEvent,
): Promise<ProjectionMessage> {
  const isMint = event.from === ZERO_ADDRESS;

  const collection = isMint
    ? await getOrCreateCollection(tx, chainReader, event.contractAddress)
    : await tx.collection.findUniqueOrThrow({ where: { contractAddress: event.contractAddress } });

  const token = isMint
    ? await createTokenFromMint(tx, chainReader, collection.id, event)
    : await tx.token.update({
        where: { collectionId_tokenId: { collectionId: collection.id, tokenId: event.tokenId } },
        data: { ownerAddress: event.to },
      });

  await tx.transfer.upsert({
    where: { txHash_logIndex: { txHash: event.txHash, logIndex: event.logIndex } },
    create: {
      tokenId: token.id,
      fromAddress: event.from,
      toAddress: event.to,
      txHash: event.txHash,
      logIndex: event.logIndex,
      blockNumber: event.blockNumber,
    },
    update: {},
  });

  return toTokenTransferredMessage(event.contractAddress, token);
}

async function getOrCreateCollection(
  tx: Prisma.TransactionClient,
  chainReader: ChainReaderPort,
  contractAddress: string,
) {
  const existing = await tx.collection.findUnique({ where: { contractAddress } });
  if (existing) {
    return existing;
  }
  const metadata = await chainReader.getCollectionMetadata(contractAddress);
  return tx.collection.create({
    data: { contractAddress, name: metadata.name, symbol: metadata.symbol },
  });
}

async function createTokenFromMint(
  tx: Prisma.TransactionClient,
  chainReader: ChainReaderPort,
  collectionId: string,
  event: TransferEvent,
) {
  // Idempotent: re-applying the same mint's Transfer (retry/reorg replay)
  // returns the already-created token instead of erroring on the unique
  // (collectionId, tokenId) constraint.
  const existing = await tx.token.findUnique({
    where: { collectionId_tokenId: { collectionId, tokenId: event.tokenId } },
  });
  if (existing) {
    return existing;
  }

  const metadata = await chainReader.getTokenMetadata(event.contractAddress, event.tokenId);
  return tx.token.create({
    data: {
      collectionId,
      tokenId: event.tokenId,
      ownerAddress: event.to,
      tokenUri: metadata.tokenUri,
      royaltyReceiver: metadata.royaltyReceiver,
      royaltyBps: metadata.royaltyBps,
    },
  });
}
