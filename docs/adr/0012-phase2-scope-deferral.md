# ADR-0012: Phase 2 Scope Deferral

**Status:** Accepted

## Context

`Master_Blueprint.md` (the project's original seed vision document) lists
15 milestones including ERC-20 Payment, Membership NFT, DAO Governance,
Embedded Wallet, Admin Dashboard, Blockchain Explorer, and Notification
System, alongside the core NFT/Marketplace/Auction/Indexer work. Attempting
all of this as one undifferentiated scope risks a portfolio project that
never reaches a fully working, demoable end-to-end state — a bigger risk
than under-scoping.

## Decision

Split scope into:
- **Phase 1 (committed, this documentation set's milestone roadmap)**:
  Wallet Auth, NFT contract, Metadata/IPFS, Marketplace (fixed-price),
  Indexer, GraphQL Backend, Frontend, Auction, Security Hardening,
  Production Deployment.
- **Phase 2 (documented, not scheduled)**: ERC-20 Payment, Membership NFT,
  DAO Governance, Embedded Wallet, Admin Dashboard, Blockchain Explorer,
  Notification System — captured in
  [Phase 2 — Future Scope](../milestones/phase-2-future-scope.md) at a
  lighter level of detail (goal + high-level approach, not full
  task/acceptance-criteria breakdown) since detailed planning for
  not-yet-scheduled work tends to go stale before it's acted on.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **Full 15-milestone blueprint scope, fully detailed, all as Phase 1** | Considered and explicitly offered to the project owner; not chosen — a large number of substantial, independent subsystems (a DAO alone is a significant scope) attempted in parallel with the core marketplace risks a long stretch with nothing fully shippable, which conflicts with this project's own "one milestone at a time, each fully shippable" principle (see [Project Overview](../01-project-overview.md)). |
| **Drop the advanced features entirely, don't document them at all** | Rejected — they're real, considered product ideas worth preserving; documenting them lightly (rather than fully or not at all) preserves the option to build them later without over-investing in detailed plans for work that isn't scheduled and may change shape by the time it starts. |

## Decision Drivers

- Matches the project's explicit principle: complete a coherent, fully
  working product first (mint → list/auction → buy, indexed, live) before
  adding subsystems (governance, membership, payments-in-other-tokens) that
  each have their own contracts, backend modules, and frontend surfaces.
- A working Phase 1 is also simply a better portfolio artifact and
  interview talking point than 15 partially-built features.

## Consequences

- `Master_Blueprint.md` is kept as a historical/reference document (see
  [docs/README.md](../README.md)) — this ADR is the record of how its scope
  was actually organized into the numbered docs and milestone plan.
- Phase 2 is revisited (re-scoped in full detail, one feature at a time,
  each getting its own milestone doc) only after Phase 1's
  [Definition of "Milestone Done"](../15-milestone-roadmap.md#5-definition-of-milestone-done-applies-to-every-milestone-doc)
  is satisfied for all of M0–M10.
