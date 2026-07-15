// Reads on-chain state that a decoded event doesn't itself carry — e.g. a
// Transfer event proves a mint happened but doesn't include the token's
// metadata URI or royalty config (those live in contract storage, read via
// view calls). Kept as a port so apply-layer unit tests can fake it instead
// of needing a live RPC connection.

export interface CollectionMetadata {
  name: string;
  symbol: string;
}

export interface TokenMetadata {
  tokenUri: string;
  royaltyReceiver: string;
  royaltyBps: number;
}

export interface ChainReaderPort {
  getCollectionMetadata(contractAddress: string): Promise<CollectionMetadata>;
  getTokenMetadata(contractAddress: string, tokenId: bigint): Promise<TokenMetadata>;
}
