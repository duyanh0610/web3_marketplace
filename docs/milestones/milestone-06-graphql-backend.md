# Milestone 6 — GraphQL Backend

## Goal

A NestJS GraphQL API, structured per Clean Architecture, serving the
indexed read model (listings, tokens, sales) with queries, mutations
(upload-prep only), and real-time subscriptions backed by the indexer's
Redis fan-out.

## Knowledge Required

- Clean Architecture layering (domain/application/infrastructure/presentation).
- NestJS code-first GraphQL (`@nestjs/graphql`), `graphql-ws` subscriptions.
- Relay-style cursor pagination.

## Tasks

1. Implement `CatalogModule` (Token, Collection types/resolvers),
   `MarketplaceModule` (Listing, Sale types/resolvers) per
   [Backend Design §3](../05-backend-design.md).
2. Implement Prisma repositories behind the ports defined in the
   application layer for each module.
3. Implement `IndexerBridgeModule`: Redis subscriber → in-process event bus
   → GraphQL subscription resolvers (`listingUpdated`, `tokenTransferred`).
4. Implement all Query fields from
   [GraphQL Schema §3](../13-graphql-schema.md) with Relay-style cursor
   pagination.
5. Implement the `requestMetadataUpload` mutation wiring to Milestone 3's
   REST upload endpoint (or fold directly if the design simplifies —
   confirm approach doesn't duplicate Milestone 3's work before
   implementing).
6. Implement global GraphQL exception filter mapping domain errors to typed
   error codes per [Backend Design §8](../05-backend-design.md).
7. Tests: unit tests for domain services (fee/royalty read-side
   projections if any derived fields exist); integration tests (Jest +
   Testcontainers Postgres) for Prisma repositories; resolver e2e tests
   (Jest + supertest) for the full query/subscription surface against a
   seeded test database.

## Acceptance Criteria

- [ ] `listings(status: ACTIVE)` query returns correctly paginated results
      matching what the indexer has written for real Sepolia activity from
      prior milestones.
- [ ] `token(collectionAddress, tokenId)` resolves nested `metadata`
      (fetched from IPFS), `activeListing`, and `transfers` correctly.
- [ ] Subscribing to `listingUpdated` and then triggering a sale on Sepolen
      (manually, via a script) produces a subscription push within a few
      seconds — proving the full chain → indexer → Redis → GraphQL
      subscription → client path works, not just the query path.
- [ ] Unauthenticated requests can query public marketplace data; `me` and
      any owner-scoped mutation correctly require a valid session (from
      Milestone 1).

## Definition of Done

- All Acceptance Criteria checked.
- Test coverage across unit/integration/e2e per
  [Testing Strategy §3](../10-testing-strategy.md).
- GraphQL schema SDL exported and committed (even though code-first,
  keep the generated `.graphql` file in the repo for review-friendliness).

## Risks

| Risk | Mitigation |
|---|---|
| N+1 query patterns on nested resolvers (e.g. Listing → Token → Collection) | DataLoader batching introduced for the resolvers that need it, verified via a query-count assertion in a resolver test |
| Subscription infrastructure (`graphql-ws` + Redis) is unfamiliar territory | Build and manually verify the single-subscription path (`listingUpdated`) fully before generalizing to the others |

## Suggested Commit Plan

1. `feat(backend): implement catalog module with token/collection resolvers`
2. `feat(backend): implement marketplace module with listing/sale resolvers`
3. `feat(backend): implement relay-style cursor pagination across list queries`
4. `feat(backend): implement indexer-bridge module consuming redis events`
5. `feat(backend): implement graphql subscriptions backed by indexer-bridge`
6. `feat(backend): implement global exception filter with typed error codes`
7. `test(backend): unit/integration/e2e coverage for catalog and marketplace modules`
