# 02 — Business Requirements

## Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Creator** | Owns/mints NFTs (art, collectibles). Has a wallet, may be non-technical. | Mint an NFT with metadata + image, list it for sale, set a royalty %, see sales history. |
| **Collector / Buyer** | Browses the marketplace, connects a wallet, buys or bids on NFTs. | Browse/search/filter listings, see provenance, buy with confidence funds/NFT will settle atomically. |
| **Marketplace Operator (Admin)** | Owns the protocol/treasury, can pause in an emergency, upgrades contracts. | Emergency pause, fee configuration, upgrade authorization, visibility into protocol health. |

Phase 2 personas (DAO member, delegated moderator, subscriber) are described
in [Phase 2 — Future Scope](./milestones/phase-2-future-scope.md).

## Phase 1 Features (committed scope)

### F1 — Wallet Authentication (SIWE)
- User connects a wallet (MetaMask, WalletConnect-compatible) via RainbowKit.
- Backend issues a SIWE (EIP-4361) challenge; user signs; backend verifies
  signature and issues a session (JWT).
- No passwords, no email required for core marketplace actions.

### F2 — NFT Collection & Minting (ERC-721)
- A creator can mint an NFT into a marketplace-managed collection contract.
- Each token has metadata (name, description, image, attributes) pinned to
  IPFS; the on-chain `tokenURI` points at the IPFS CID.
- Contract is UUPS upgradeable and supports EIP-2981 royalties, configured at
  mint time by the creator.

### F3 — Metadata & IPFS Pipeline
- Image + metadata JSON upload flow: file → pinned to IPFS via Pinata →
  CID stored and referenced by the mint transaction.
- Metadata schema follows the OpenSea-compatible standard, extended with a
  royalty field for indexer/UI convenience (source of truth for royalty
  enforcement remains the on-chain EIP-2981 call).

### F4 — Marketplace (fixed-price listings)
- Owner lists an owned NFT for a fixed price (native ETH on Sepolia).
- Buyer purchases in a single transaction: NFT transfers to buyer, proceeds
  (minus protocol fee and creator royalty) are credited to the seller via
  pull-payment.
- Seller can cancel an active listing.
- Reentrancy-safe, checks-effects-interactions throughout (see
  [Security Model](./09-security-model.md)).

### F5 — Blockchain Indexer
- Dedicated service subscribes to `Transfer`, `Listed`, `Sold`, `Cancelled`
  events (and auction events once F8 lands), decodes them, and maintains a
  normalized read model in PostgreSQL.
- Publishes decoded domain events to Redis so the backend (and, later,
  the notification system) can react without polling the chain.
- Handles reorgs by tracking confirmations and re-validating recently
  indexed blocks.

### F6 — GraphQL Backend
- NestJS, Clean Architecture, GraphQL API over the indexed read model plus
  write-path orchestration (e.g., preparing typed calldata, SIWE auth,
  presigned IPFS uploads).
- Backend never custodies funds or NFTs and never signs transactions on a
  user's behalf; all state-changing blockchain actions are signed
  client-side by the user's wallet.

### F7 — Frontend (Next.js marketplace dApp)
- Wallet connect, NFT gallery, listing detail page, mint flow, "my listings"
  / "my NFTs" profile view, buy/cancel actions with on-chain confirmation
  tracking.

### F8 — Auction (English auction)
- Seller lists an NFT for timed English auction (reserve price, end time).
- Bidders submit bids that must strictly exceed the current highest bid;
  outbid bidders can withdraw their bid via pull-payment.
- On auction end, anyone can call `settle()`; NFT goes to the highest
  bidder, proceeds (minus fee/royalty) go to the seller.

## Phase 1 — Cross-cutting Non-Functional Requirements

- **Security**: OWASP-for-smart-contracts checklist applied to every
  contract (see [Security Model](./09-security-model.md)); static analysis
  (Slither) in CI; fuzz/invariant testing on Marketplace and Auction before
  Sepolia deployment.
- **Upgradeability**: NFT and Marketplace contracts deployed behind UUPS
  proxies from day one (not retrofitted later — see
  [ADR-0005](./adr/0005-upgradeable-contracts-uups.md)).
- **Observability**: structured logs, basic metrics/dashboards, and error
  tracking wired before "Production Deployment" milestone is considered done.
- **Testability**: every contract, backend module, and critical frontend
  flow has automated tests; CI blocks merges on failing tests or lint.
- **Documentation-first**: no Phase 1 milestone begins implementation before
  its corresponding design section in this doc set is written and
  consistent with the rest.

## Phase 2 — Deferred Features (documented, not committed)

Full detail in [Phase 2 — Future Scope](./milestones/phase-2-future-scope.md).
Summarized:

| Feature | One-line description |
|---|---|
| ERC-20 Payment | Pay for listings/auctions in a custom or standard ERC-20 token in addition to native ETH. |
| Membership NFT | Soulbound/non-transferable or gated NFT granting subscription-style access (e.g., reduced fees). |
| DAO Governance | Governor + Timelock contracts letting token holders vote on protocol parameters (fees, treasury spend). |
| Embedded Wallet | Social-login / account-abstraction wallet option for non-crypto-native users. |
| Admin Dashboard | Internal ops UI: moderation, fee config, protocol health, manual pause controls. |
| Blockchain Explorer | Minimal internal explorer over indexed data (txs, addresses, tokens) for debugging/demo. |
| Notification System | Event-driven notifications (email/webhook/push) fed by indexer → Redis → notification worker. |

**Why deferred:** each of these is a genuinely separate subsystem with its
own contracts and/or services. Building them in parallel with the Phase 1
core risks shipping nothing end-to-end. See
[ADR-0012](./adr/0012-phase2-scope-deferral.md) for the full rationale.

## Acceptance Definition for "Phase 1 Complete"

A user with a fresh wallet and Sepolia test ETH can, without touching a
database or backend directly:

1. Sign in with their wallet (SIWE).
2. Mint an NFT with an image and metadata pinned to IPFS.
3. List it for a fixed price, or start an auction.
4. Have a second wallet buy it / win the auction, with royalty and fee
   correctly split, visible within seconds in the frontend (via the
   indexer → GraphQL → UI path, not a page refresh hitting the chain
   directly).
5. See the full listing/sale history for that token.

All of the above is deployed and reachable at a public URL (frontend on
Vercel/Railway, backend on Railway, contracts verified on Sepolia Etherscan).
