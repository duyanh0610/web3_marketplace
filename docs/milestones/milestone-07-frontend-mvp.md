# Milestone 7 — Frontend MVP

## Goal

A Next.js dApp implementing the full fixed-price golden path in the
browser: connect wallet, sign in, mint, list, browse, buy — all reflecting
real Sepolia state through the GraphQL backend.

## Knowledge Required

- Next.js App Router Server/Client Component boundaries.
- wagmi write/read hooks, transaction lifecycle handling.
- GraphQL client setup (Apollo Client or `graphql-request` + TanStack Query
  — pick one and document the choice inline in this milestone's PR once
  decided, per [Frontend Design §1](../06-frontend-design.md)).

## Tasks

1. Set up GraphQL client + codegen against the backend schema, populating
   `packages/graphql-types`.
2. Implement `features/auth`: connect + SIWE sign-in UI (built in
   Milestone 1, integrated into the full app shell here).
3. Implement `features/catalog`: listing grid (Server Component, GraphQL
   query), listing detail page, NFT metadata rendering (sanitized, per
   [Security Model §5](../09-security-model.md)).
4. Implement mint flow: form → upload (Milestone 3 endpoint) → on-chain
   `mint()` call → confirmation tracking → appears in "My NFTs".
5. Implement listing flow: `approve()` + `list()` on-chain calls with
   transaction-state UI.
6. Implement buy flow: `buy()` on-chain call, optimistic UI + subscription-
   driven confirmation (Milestone 6's `listingUpdated` subscription).
7. Implement "My NFTs" / "My Listings" profile view.
8. Playwright e2e test: full golden path across two browser contexts
   (seller mints+lists, buyer buys), against local Hardhat node + seeded
   backend, per [Testing Strategy §5](../10-testing-strategy.md).

## Acceptance Criteria

- [ ] A fresh wallet with Sepolia test ETH can, purely through the UI:
      sign in, mint an NFT, list it, and a second wallet can buy it — with
      the listing status updating in the UI without a manual page refresh.
- [ ] Every wallet-gated action has a clear disabled/CTA state when
      disconnected (no silently-disabled buttons).
- [ ] A rejected/failed transaction surfaces a decoded, human-readable
      error, not a raw RPC error blob.
- [ ] The Playwright golden-path e2e test passes in CI.
- [ ] Mobile viewport (checked manually in browser dev tools at minimum)
      renders the listing grid and detail page usably.

## Definition of Done

- All Acceptance Criteria checked.
- Playwright suite green in CI.
- Manually verified end-to-end against real Sepolia (not just the local
  Hardhat node) at least once before marking this milestone done.

## Risks

| Risk | Mitigation |
|---|---|
| Indexer catch-up latency creates a confusing "did my mint work?" moment | Optimistic "minting…" UI state bridging tx-confirmed → indexer-caught-up (see [Frontend Design §6](../06-frontend-design.md)) |
| GraphQL client choice (Apollo vs graphql-request) turns out wrong mid-build | Time-box the decision early in this milestone; both are swappable behind the `features/*` hook layer if reconsidered |

## Suggested Commit Plan

1. `feat(frontend): set up graphql client and codegen`
2. `feat(frontend): integrate auth/SIWE flow into app shell`
3. `feat(frontend): implement listing grid and listing detail pages`
4. `feat(frontend): implement mint flow with ipfs upload and on-chain mint`
5. `feat(frontend): implement list-for-sale flow with approve+list transactions`
6. `feat(frontend): implement buy flow with subscription-driven updates`
7. `feat(frontend): implement my-nfts and my-listings profile views`
8. `test(frontend): playwright e2e golden path across two wallets`
