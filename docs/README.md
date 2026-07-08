# Documentation Index — Web3 NFT Marketplace

This is the engineering documentation set for the Web3 NFT Marketplace portfolio
project. It is written before implementation begins, and is the single source
of truth for architecture, scope, and process. Update it whenever a decision
changes — code should never contradict these documents without the
corresponding doc being updated first.

Seed vision document: [`Master_Blueprint.md`](./Master_Blueprint.md) (original
brainstorm — superseded in detail by the numbered docs below, kept for
historical reference).

## How to read this set

1. Start with the **Overview** and **Business Requirements** to understand
   *why* this exists and *what* it must do.
2. Read **System Architecture** for the big picture, then drill into the
   per-layer design docs (contracts, backend, frontend, database, indexer).
3. **ADRs** record *why* a specific technical choice was made over its
   alternatives — read them when you disagree with a decision before
   re-litigating it in code.
4. **Milestone Roadmap** + `milestones/*.md` are the execution plan.
   Implementation proceeds one milestone at a time, in order, only after this
   documentation set is approved.

## Core Documents

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Project Overview](./01-project-overview.md) | Vision, goals, non-goals, glossary |
| 02 | [Business Requirements](./02-business-requirements.md) | Features, personas, user stories, scope (Phase 1 vs Phase 2) |
| 03 | [System Architecture](./03-system-architecture.md) | C4-style architecture, data flow, tech stack rationale |
| 04 | [Smart Contract Design](./04-smart-contract-design.md) | Contract map, UUPS upgrade strategy, storage layout rules |
| 05 | [Backend Design](./05-backend-design.md) | Clean Architecture layering in NestJS |
| 06 | [Frontend Design](./06-frontend-design.md) | Next.js app structure, wallet integration, state management |
| 07 | [Database Design](./07-database-design.md) | PostgreSQL schema, ER diagram, indexing strategy |
| 08 | [Blockchain Indexer](./08-blockchain-indexer.md) | Event ingestion, reorg handling, backfill, Redis fan-out |
| 09 | [Security Model](./09-security-model.md) | Threat model, contract & backend hardening, key management |
| 10 | [Testing Strategy](./10-testing-strategy.md) | Unit/integration/fuzz/invariant/e2e across all layers |
| 11 | [DevOps & CI/CD](./11-devops-cicd.md) | Environments, pipelines, deployment, monitoring |
| 12 | [API Specification](./12-api-specification.md) | REST surface (auth, webhooks, health) |
| 13 | [GraphQL Schema](./13-graphql-schema.md) | Types, queries, mutations, subscriptions |
| 14 | [Coding Guidelines](./14-coding-guidelines.md) | Style, conventions, review checklist per language |
| 15 | [Milestone Roadmap](./15-milestone-roadmap.md) | Phase 1/Phase 2 breakdown, dependency graph |
| 16 | [Sequence Diagrams](./16-sequence-diagrams.md) | Cross-system flows: mint, list, buy, bid, withdraw |

## Architecture Decision Records

See [`adr/README.md`](./adr/README.md) for the full index and status of each ADR.

## Milestones

See [`milestones/README.md`](./milestones/README.md) for the detailed,
per-milestone execution docs (goal, tasks, acceptance criteria, DoD, risks,
commit plan).
