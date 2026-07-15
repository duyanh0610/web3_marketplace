import { decodeEventLog, type Log } from "viem";
import { MARKETPLACE_ABI, MARKETPLACE_NFT_ABI } from "@we3/contracts-abi";
import { DecodedEvent } from "./types";

function logContext(log: Log): { blockNumber: bigint; txHash: string; logIndex: number } {
  if (log.blockNumber == null || log.transactionHash == null || log.logIndex == null) {
    throw new Error("Log is missing blockNumber/transactionHash/logIndex (pending log?)");
  }
  return { blockNumber: log.blockNumber, txHash: log.transactionHash, logIndex: log.logIndex };
}

/** Decodes a raw log against the MarketplaceNFT ABI. Returns null for any
 * log that isn't a `Transfer` event (including logs from a different ABI
 * entirely — decodeEventLog throws in that case, caught here). */
export function decodeMarketplaceNftLog(log: Log): DecodedEvent | null {
  let decoded;
  try {
    decoded = decodeEventLog({
      abi: MARKETPLACE_NFT_ABI as Parameters<typeof decodeEventLog>[0]["abi"],
      data: log.data,
      topics: log.topics,
      strict: false,
    });
  } catch {
    return null;
  }
  if (decoded.eventName !== "Transfer") {
    return null;
  }

  const args = decoded.args as { from: string; to: string; tokenId: bigint };
  return {
    eventName: "Transfer",
    contractAddress: log.address.toLowerCase(),
    from: args.from.toLowerCase(),
    to: args.to.toLowerCase(),
    tokenId: args.tokenId,
    ...logContext(log),
  };
}

/** Decodes a raw log against the Marketplace ABI. Returns null for any log
 * that isn't one of Listed/Cancelled/Sold. */
export function decodeMarketplaceLog(log: Log): DecodedEvent | null {
  let decoded;
  try {
    decoded = decodeEventLog({
      abi: MARKETPLACE_ABI as Parameters<typeof decodeEventLog>[0]["abi"],
      data: log.data,
      topics: log.topics,
      strict: false,
    });
  } catch {
    return null;
  }

  const context = logContext(log);
  switch (decoded.eventName) {
    case "Listed": {
      const args = decoded.args as { listingId: bigint; nft: string; tokenId: bigint; seller: string; price: bigint };
      return {
        eventName: "Listed",
        listingId: args.listingId,
        nft: args.nft.toLowerCase(),
        tokenId: args.tokenId,
        seller: args.seller.toLowerCase(),
        price: args.price,
        ...context,
      };
    }
    case "Cancelled": {
      const args = decoded.args as { listingId: bigint };
      return { eventName: "Cancelled", listingId: args.listingId, ...context };
    }
    case "Sold": {
      const args = decoded.args as {
        listingId: bigint;
        buyer: string;
        price: bigint;
        feeAmount: bigint;
        royaltyAmount: bigint;
        royaltyReceiver: string;
      };
      return {
        eventName: "Sold",
        listingId: args.listingId,
        buyer: args.buyer.toLowerCase(),
        price: args.price,
        feeAmount: args.feeAmount,
        royaltyAmount: args.royaltyAmount,
        royaltyReceiver: args.royaltyReceiver.toLowerCase(),
        ...context,
      };
    }
    default:
      return null;
  }
}
