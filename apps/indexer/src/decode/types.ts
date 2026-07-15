// Decoded, projection-ready representation of a contract event — pure data,
// no DB/RPC access. Addresses are lowercased for consistent storage/lookup.
// See docs/08-blockchain-indexer.md §6 for the event → projection mapping.

interface LogContext {
  blockNumber: bigint;
  txHash: string;
  logIndex: number;
}

export interface TransferEvent extends LogContext {
  eventName: "Transfer";
  contractAddress: string;
  from: string;
  to: string;
  tokenId: bigint;
}

export interface ListedEvent extends LogContext {
  eventName: "Listed";
  listingId: bigint;
  nft: string;
  tokenId: bigint;
  seller: string;
  price: bigint;
}

export interface CancelledEvent extends LogContext {
  eventName: "Cancelled";
  listingId: bigint;
}

export interface SoldEvent extends LogContext {
  eventName: "Sold";
  listingId: bigint;
  buyer: string;
  price: bigint;
  feeAmount: bigint;
  royaltyAmount: bigint;
  royaltyReceiver: string;
}

export type DecodedEvent = TransferEvent | ListedEvent | CancelledEvent | SoldEvent;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
