export interface TransferRecord {
  id: string;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  blockNumber: string; // stringified bigint
  occurredAt: Date;
}

export interface TransferRepository {
  findByTokenId(tokenId: string, args: { take: number; cursorId?: string }): Promise<TransferRecord[]>;
  // Backs the tokenTransferred subscription (IndexerBridgeModule): the
  // Redis event only carries the new owner, not the Transfer row's own
  // fields (txHash, blockNumber, id), so this re-fetches the real latest row.
  findLatestByTokenId(tokenId: string): Promise<TransferRecord | null>;
}

export const TRANSFER_REPOSITORY = Symbol("TRANSFER_REPOSITORY");
