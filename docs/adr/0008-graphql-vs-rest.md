# ADR-0008: GraphQL vs REST

**Status:** Accepted

## Context

The project owner has existing NestJS + GraphQL experience. The API needs
to serve highly relational, nested, client-driven queries (a listing with
its token, its token's metadata and transfer history, its collection) with
varying shapes per screen (grid view needs less than detail view).

## Decision

**GraphQL is the primary API.** A small REST surface exists only for
health checks, SIWE auth, file upload, and internal webhooks — endpoints
that are either not naturally query-shaped or need to interoperate with
non-GraphQL clients (Pinata webhook, load balancer health checks).

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **REST only** | Would require either heavy over-fetching (return full nested objects always) or a proliferation of purpose-built endpoints per screen shape (`/listings/grid`, `/listings/detail/:id`) — GraphQL's client-specified field selection fits this domain's genuinely nested, view-dependent data needs better. |
| **REST + GraphQL as two parallel full APIs** | Rejected — duplicating the marketplace data surface in both REST and GraphQL is pure maintenance overhead with no client that needs both; see [API Specification §3](../12-api-specification.md). |
| **tRPC** | Excellent DX for a single TypeScript-only client, but this project's frontend is the primary consumer today while GraphQL's schema-first contract and subscription support (for real-time listing/auction updates) fit the event-driven architecture better, and match the owner's existing GraphQL experience directly. |

## Decision Drivers

- Existing owner expertise in NestJS + GraphQL (per
  [Project Overview](../01-project-overview.md)) — this ADR is as much
  about not re-deciding a stack the owner already knows well as it is about
  GraphQL's technical fit.
- GraphQL subscriptions map naturally onto the Redis event fan-out from the
  indexer (see [Blockchain Indexer §7](../08-blockchain-indexer.md)),
  giving real-time listing/auction updates without a bespoke WebSocket
  protocol.

## Consequences

- Full schema in [GraphQL Schema](../13-graphql-schema.md); REST surface in
  [API Specification](../12-api-specification.md).
- Code-first schema generation (NestJS decorators) chosen over schema-first
  SDL-authored-by-hand — see
  [Backend Design §6](../05-backend-design.md).
