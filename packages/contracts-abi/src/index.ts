// Generated ABIs + deployed addresses per network, published here so
// apps/frontend and apps/indexer never hand-copy a contract ABI/address.
// See docs/03-system-architecture.md §4 and docs/06-frontend-design.md §4.
// Regenerate via `NFT_PROXY_ADDRESS=<addr> npx hardhat run scripts/export-abi.ts
// --network <net>` from apps/contracts after a deploy.

import marketplaceNftAbi from "./marketplace-nft.abi.json";
import marketplaceNftAddresses from "./marketplace-nft.addresses.json";

export const MARKETPLACE_NFT_ABI = marketplaceNftAbi;

export type MarketplaceNftNetwork = keyof typeof marketplaceNftAddresses;

export function getMarketplaceNftAddress(network: MarketplaceNftNetwork): string {
  return marketplaceNftAddresses[network];
}
