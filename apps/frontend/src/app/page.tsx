"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

// Scaffold-only placeholder page. Real marketplace grid/listing pages are
// built in Milestone 7 — see docs/milestones/milestone-07-frontend-mvp.md.
export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Web3 NFT Marketplace</h1>
      <p>Frontend scaffold — wallet connect wired via RainbowKit + wagmi.</p>
      <ConnectButton />
    </main>
  );
}
