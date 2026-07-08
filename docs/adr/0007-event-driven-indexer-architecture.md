# ADR-0007: Event-Driven Indexer Architecture

**Status:** Accepted

## Context

The backend needs to serve fast, filterable, joinable queries over
marketplace state (listings, sales, ownership). Reading this directly from
the chain on every request (N RPC calls per page, no server-side filtering/
sorting) does not scale and doesn't match how any real NFT marketplace
frontend actually works.

## Decision

Build a **dedicated, standalone indexer service** that subscribes to
contract events, decodes them, and maintains a normalized PostgreSQL
projection, publishing decoded events to Redis for downstream consumers.
The blockchain remains the sole source of truth; the database is a
rebuildable projection, never authoritative on its own.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **Query chain directly from the backend on each request** | Prohibitively slow (multiple RPC round-trips per page), no server-side filtering/sorting/pagination without an order-book-like on-chain structure this project explicitly rejected (see [Smart Contract Design §7](../04-smart-contract-design.md)), and couples API latency to RPC provider latency/rate limits. |
| **Hosted subgraph (TheGraph)** | Would remove the need to write an indexer at all — but the explicit project goal is to demonstrate *building* an event-driven indexer, and a subgraph's declarative AssemblyScript mapping model is harder to extend with the off-chain side effects (Redis fan-out, future notification fan-out) this project wants. Revisit only if indexer maintenance becomes a bottleneck, as its own ADR. |
| **Indexer logic embedded as a NestJS module inside the backend** | Considered for simplicity, but rejected — couples the indexer's failure modes (RPC disconnects, reorg handling, backfill load) to backend request-serving uptime, and blurs the "single writer" boundary for projection tables (see [Blockchain Indexer §2](../08-blockchain-indexer.md)). |

## Decision Drivers

- **Chain-as-source-of-truth** is the single most load-bearing invariant in
  this system's design (see
  [Project Overview — Guiding Principles](../01-project-overview.md)); a
  separate indexer process makes "who's allowed to write the projection"
  a deployment fact, not a convention.
- Reorg handling, confirmation-depth delay, and backfill/replay are each
  meaningfully complex on their own (see
  [Blockchain Indexer §3–4](../08-blockchain-indexer.md)) and benefit from
  being isolated, independently testable, independently scalable/
  restartable.

## Consequences

- `apps/indexer` has no HTTP API; it is a producer only (writes DB, publishes
  Redis messages). The backend is purely a consumer of what it produces.
- A documented "rebuild from chain" runbook must exist and be exercised at
  least once (see [Database Design §7](../07-database-design.md)) to prove
  the projection is genuinely rebuildable, not just claimed to be.
