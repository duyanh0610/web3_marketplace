# Phase 2 — Future Scope

Not scheduled. Documented at a lighter level of detail than Phase 1
milestones deliberately — see
[ADR-0012](../adr/0012-phase2-scope-deferral.md) for why. Each item below
gets a full milestone doc (Goal/Tasks/Acceptance/DoD/Risks/Commit Plan)
only once Phase 1 (M0–M10) is complete and one of these is actually picked
up.

## ERC-20 Payment

**Goal:** allow listings/auctions to be denominated and settled in a
custom or standard ERC-20 token, in addition to native ETH.

**Approach sketch:** `Marketplace` gains a `paymentToken` field per listing
(address(0) = native ETH, else an ERC-20 address); `buy()`/`bid()` use
`transferFrom` with a pre-approval step instead of `msg.value` when a token
is set. Pull-payment ledger becomes per-token (`mapping(address token =>
mapping(address account => uint256))`).

**Why deferred:** touches the core Marketplace payment path that Phase 1's
security hardening ([Milestone 9](./milestone-09-security-hardening.md))
specifically validates — safer to add after that surface is stable and
fuzz-tested, then re-run the hardening pass for the new payment path.

## Membership NFT

**Goal:** a non-transferable (or transfer-restricted) NFT granting
subscription-style benefits (e.g. reduced marketplace fees).

**Approach sketch:** separate `Membership` contract (soulbound ERC-721
variant, `_beforeTokenTransfer` overridden to block transfers except
mint/burn); `Marketplace` reads membership status to adjust `feeBps` per
seller.

**Why deferred:** introduces a second NFT contract and a fee-calculation
dependency on external contract state — real scope, not a quick add-on.

## DAO Governance

**Goal:** token-holder voting on protocol parameters (fee %, treasury
spend) via OpenZeppelin `Governor` + `TimelockController`.

**Approach sketch:** a governance token (could reuse the Phase 2 ERC-20
payment token or a separate one — decide when scoped), `Governor` contract
proposing changes executed through the *same* `TimelockController` already
gating contract upgrades ([ADR-0005](../adr/0005-upgradeable-contracts-uups.md)),
unifying the admin-authority model rather than adding a second parallel one.

**Why deferred:** a substantial subsystem on its own; also most valuable
once there's a real fee-generating marketplace whose parameters are worth
governing.

## Embedded Wallet

**Goal:** a social-login / account-abstraction wallet option for
non-crypto-native users, as an alternative to requiring MetaMask/
WalletConnect.

**Approach sketch:** integrate a dedicated account-abstraction/embedded-
wallet provider (e.g. Privy, Web3Auth, or ERC-4337 smart accounts) —
**not** a backend-held EOA key, to preserve the "backend never signs
transactions" principle ([System Architecture §3](../03-system-architecture.md)).

**Why deferred:** a meaningfully different wallet integration model
alongside the existing wagmi/RainbowKit flow; best tackled once the core
wallet-based flow is fully proven, so there's a clear baseline to compare
UX against.

## Admin Dashboard

**Goal:** internal ops UI for moderation, fee configuration, protocol
health visibility, manual pause controls.

**Approach sketch:** a separate Next.js app (or a role-gated section of the
existing frontend) calling the same GraphQL backend plus a small
admin-only API surface, authenticated via the same SIWE flow with an
additional on-chain role check (e.g. Safe signer address allowlist).

**Why deferred:** genuinely a separate frontend surface with its own
design/auth-boundary questions; not needed until there's real marketplace
activity worth administering.

## Blockchain Explorer

**Goal:** a minimal internal explorer over the indexed data (transactions,
addresses, tokens) for debugging and demo purposes.

**Approach sketch:** a read-only frontend section querying the existing
GraphQL API's data plus a few explorer-specific queries (by tx hash, by
address) added to the schema.

**Why deferred:** nice-to-have on top of an already-indexed dataset — low
risk to add later, genuinely low priority relative to the core product.

## Notification System

**Goal:** event-driven notifications (email/webhook/push) for relevant
marketplace events (outbid, sold, auction ending soon).

**Approach sketch:** a `notification-dispatch` BullMQ worker subscribing to
the same Redis channels the indexer already publishes to
([Blockchain Indexer §7](../08-blockchain-indexer.md)) — the indexer needs
no changes when this ships, by design.

**Why deferred:** valuable, but depends on having real users with
preferences to notify; the indexer/Redis groundwork is already in place
from Phase 1, so this is one of the cheaper Phase 2 items to eventually
add.
