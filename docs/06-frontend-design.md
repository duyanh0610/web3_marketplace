# 06 — Frontend Design

## 1. Stack

Next.js (App Router) + TypeScript, wagmi v2 + viem for wallet/chain
interaction, RainbowKit for wallet-connect UI, TanStack Query (via wagmi's
built-in integration) for async state, Apollo Client (or `graphql-request` +
TanStack Query — decided in Milestone 6/7, see
[Milestone 7](./milestones/milestone-07-frontend-mvp.md)) for the GraphQL
API.

## 2. Why App Router + Server Components (with caveats)

- Marketplace browsing pages (listing grid, listing detail) are largely
  read-only and SEO-relevant → good fit for React Server Components fetching
  from the GraphQL backend at request time.
- Anything wallet-dependent (connect button, buy/bid/mint actions, "my
  listings") is a Client Component — wagmi hooks require the browser wallet
  provider and cannot run server-side. The boundary is drawn explicitly at
  the component level (`"use client"`), not by making the whole app client
  rendered.

## 3. Directory Structure (`apps/frontend/src`)

```
src/
├── app/                      # Next.js App Router routes
│   ├── (marketplace)/
│   │   ├── page.tsx          # Listing grid
│   │   └── listing/[id]/page.tsx
│   ├── mint/page.tsx
│   ├── profile/[address]/page.tsx
│   └── layout.tsx
├── features/                 # Feature-sliced, mirrors backend modules
│   ├── auth/                 # SIWE connect + sign-in flow
│   ├── catalog/              # NFT gallery, metadata display
│   ├── marketplace/          # Listing card, buy/cancel actions
│   └── auction/              # Bid form, countdown, settle action
├── shared/
│   ├── ui/                   # Design-system-agnostic primitives (Button, Card...)
│   ├── graphql/               # Generated types + hooks (codegen)
│   └── web3/                  # wagmi config, chain config, contract ABIs/addresses
└── middleware.ts              # Attaches session cookie/JWT to requests
```

Feature-sliced structure deliberately mirrors the backend's module
boundaries (`catalog`, `marketplace`, `auction`) so a change to one bounded
context touches one feature folder on both sides of the stack.

## 4. Wallet & Chain State

- `wagmi` config is the single source of truth for supported chains
  (Sepolia only in Phase 1), configured once in `shared/web3/wagmi.ts`.
- Contract addresses and ABIs are generated artifacts, not hand-copied:
  Hardhat deployment output → a shared `packages/contracts-abi` package →
  imported by both frontend and indexer. See
  [ADR-0001](./adr/0001-monorepo-tooling.md). This guarantees the frontend
  can never call a stale/mismatched ABI after a contract upgrade.
- Transaction lifecycle (idle → awaiting signature → pending → confirmed/
  failed) is modeled explicitly in each action hook (e.g. `useBuyListing`)
  using wagmi's `useWriteContract` + `useWaitForTransactionReceipt`, surfaced
  to the UI as a small state machine, not a boolean `isLoading`.

## 5. Data Fetching Strategy

| Data | Source | Why |
|---|---|---|
| Listing grid, listing detail, sales history | GraphQL backend (indexed read model) | Fast, queryable, joined/filterable — reading this from chain directly would mean N RPC calls per page. |
| "Is this listing still valid right now" at the moment of clicking Buy | GraphQL backend, then re-validated on-chain by the contract itself inside `buy()` | UI can show best-effort freshness; the contract is the actual authority and will revert a stale buy. |
| Wallet balance, connected address, chain ID | wagmi hooks directly against the wallet/RPC | Inherently client-local, no reason to round-trip the backend. |
| Real-time "listing just sold" updates | GraphQL subscription (backed by indexer → Redis → backend, see [System Architecture](./03-system-architecture.md)) | Avoids polling; matches the event-driven design end-to-end. |

## 6. NFT Minting Flow (UI)

1. User fills form (image, name, description, attributes, royalty %).
2. Frontend uploads image + metadata JSON to the backend's presigned/proxy
   upload endpoint, which pins to IPFS via Pinata and returns a CID.
3. Frontend calls `mint(to, tokenURI, royaltyReceiver, royaltyBps)` directly
   on the NFT contract via wagmi — **not** through the backend. The backend
   never mints on the user's behalf.
4. UI waits for confirmation, then the indexer's `Transfer` event handler
   makes it show up in "My NFTs" (polled/subscribed via GraphQL) — expect a
   few seconds of latency and design the UI to show an optimistic
   "minting..." state bridging the gap between tx confirmation and indexer
   catch-up.

## 7. Accessibility & Responsiveness

- All wallet-gated actions have a clear disabled/disconnected state with an
  explanit call-to-action ("Connect wallet to bid"), never a silently
  disabled button.
- Component library built mobile-first; marketplace browsing must work on a
  phone since that's how most reviewers will first click a portfolio link.

## 8. What the Frontend Explicitly Does Not Do

- No client-side private key handling beyond what the wallet provider
  (MetaMask/WalletConnect) manages — the app never touches a raw key.
- No direct database or Prisma access — all data comes through GraphQL.
- No silent retries of failed on-chain transactions — a failed/reverted tx
  is surfaced to the user with the decoded revert reason where possible.
