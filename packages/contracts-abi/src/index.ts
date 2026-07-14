// Generated ABIs + deployed addresses per network, published here so
// apps/frontend and apps/indexer never hand-copy a contract ABI/address.
// See docs/03-system-architecture.md §4 and docs/06-frontend-design.md §4.
// Regenerate via `CONTRACT_NAME=<Name> PROXY_ADDRESS=<addr> npx hardhat run
// scripts/export-abi.ts --network <net>` from apps/contracts after a deploy.

import marketplaceNftAbi from "./marketplace-nft.abi.json";
import marketplaceNftAddresses from "./marketplace-nft.addresses.json";
import marketplaceAbi from "./marketplace.abi.json";
import marketplaceAddresses from "./marketplace.addresses.json";

export const MARKETPLACE_NFT_ABI = marketplaceNftAbi;

export type MarketplaceNftNetwork = keyof typeof marketplaceNftAddresses;

export function getMarketplaceNftAddress(network: MarketplaceNftNetwork): string {
  return marketplaceNftAddresses[network];
}

export const MARKETPLACE_ABI = marketplaceAbi;

export type MarketplaceNetwork = keyof typeof marketplaceAddresses;

export function getMarketplaceAddress(network: MarketplaceNetwork): string {
  return marketplaceAddresses[network];
}
