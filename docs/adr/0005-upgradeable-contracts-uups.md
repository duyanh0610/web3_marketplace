# ADR-0005: Upgradeable Contracts (UUPS)

**Status:** Accepted

## Context

The project requires upgradeable smart contracts (explicit business
requirement). Main proxy patterns available: Transparent Proxy, UUPS, and
Diamond (EIP-2535, multi-facet). Also had to decide *when* to introduce
upgradeability — at initial deployment, or retrofitted after a simpler
non-upgradeable version works.

## Decision

Deploy `MarketplaceNFT` and `Marketplace` behind **UUPS (EIP-1822)** proxies
**from their first Sepolia deployment**, not retrofitted later. Upgrade
authorization (`_authorizeUpgrade`) is gated behind a Gnosis Safe multisig +
`TimelockController`.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **Transparent Proxy (OpenZeppelin's older standard)** | Higher per-call gas overhead (admin-check branch in every proxy call) and requires a separate `ProxyAdmin` contract; UUPS puts upgrade logic in the implementation, which is both cheaper and lets a "final" version permanently disable further upgrades by making `_authorizeUpgrade` revert — a meaningful trust signal this project wants to be able to demonstrate. |
| **Diamond pattern (EIP-2535)** | Solves a different problem (contracts exceeding the 24KB size limit via multi-facet composition) that this project doesn't have — `MarketplaceNFT` and `Marketplace` are each comfortably within size limits. Diamond's added complexity (facet storage collision risk, more complex tooling) isn't justified here. |
| **Non-upgradeable contracts, redeploy-and-migrate on change** | Simpler to reason about, and arguably *more* trustworthy to end users (immutability is a feature, not just a limitation) — but the project's explicit requirement is to demonstrate upgradeable-contract architecture, and migration-based "redeploy" loses all on-chain history/state continuity (token IDs, listing IDs) on every change, which is worse for a live marketplace than an upgrade. |
| **Build non-upgradeable first, add UUPS later as its own milestone** | This was the blueprint's original ordering (Milestone 12: "Upgradeable Contracts" listed after Marketplace/Auction). Deliberately overridden here: retrofitting upgradeability onto an already-deployed, already-used contract requires a data migration to a new proxy-based deployment, which is strictly harder and riskier than designing for it from the start. Designing for UUPS from day one costs a small amount of extra ceremony per contract (initializer instead of constructor, storage gaps) and avoids that migration entirely. |

## Decision Drivers

- Real marketplaces (OpenSea's Seaport, Blur, etc.) generally build
  upgradeability in from the start precisely because retrofitting it is
  costly — this project follows that industry norm rather than the
  blueprint's original "add upgradeability later" ordering.
- Multisig + timelock gating on `_authorizeUpgrade` (rather than a single
  EOA owner) is the standard mitigation for "single compromised key can
  rewrite all contract logic" — see [Security Model §3](../09-security-model.md).

## Consequences

- Every upgradeable contract needs: `initializer` instead of a constructor,
  `_disableInitializers()` in an actual (disabled) constructor, a storage
  gap, and passes `@openzeppelin/hardhat-upgrades`' storage-layout
  validation in CI on every change (see
  [Smart Contract Design §2](../04-smart-contract-design.md)).
- A Gnosis Safe must be deployed and its address configured as owner
  *before* the first "real" (non-deployer-EOA-owned) Sepolia deployment —
  sequenced explicitly in
  [Milestone 2](../milestones/milestone-02-nft-contract.md) and
  [Milestone 9](../milestones/milestone-09-security-hardening.md).
- This is a deliberate deviation from the original Master_Blueprint.md
  milestone ordering — noted here so it isn't mistaken for an oversight.
