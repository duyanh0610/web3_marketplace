import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

// Single source of truth for supported chains — Sepolia only in Phase 1.
// See docs/adr/0002-blockchain-network-and-environment.md.
export const wagmiConfig = getDefaultConfig({
  appName: "Web3 NFT Marketplace",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: [sepolia],
  ssr: true,
});
