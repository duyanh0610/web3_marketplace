# ADR-0006: Database & ORM Choice

**Status:** Accepted

## Context

Backend and indexer both need to read/write PostgreSQL. NestJS's most
common tutorial-default ORM is TypeORM; the project owner already has
PostgreSQL experience from prior NestJS work.

## Decision

**PostgreSQL + Prisma.**

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **TypeORM** | The "default" NestJS choice, and the owner likely has prior experience with it — but its migration workflow and type-safety are weaker than Prisma's (types are inferred from decorated entity classes rather than generated from a single schema source), and Active Record/Data Mapper duality adds decisions this project doesn't need. |
| **Kysely / raw SQL query builder** | Excellent type safety and no ORM "magic," but requires hand-writing all migrations and more boilerplate for straightforward CRUD-shaped projection tables — this project's schema (see [Database Design](../07-database-design.md)) is exactly the simple, well-normalized shape Prisma handles well; Kysely's extra control isn't needed here. |
| **MongoDB / document store** | Considered given event-log-shaped data, but the read model has real relational structure (tokens → listings → sales, foreign keys, joins for "my listings with token metadata") that a relational DB expresses more naturally and enforces via constraints; Postgres was also already a stated existing-skill of the project owner. |

## Decision Drivers

- **Single schema file** (`schema.prisma`) is the one source of truth for
  both the generated client's types and the migration history — reduces
  the chance of application types and actual DB schema drifting apart,
  which matters more here than usual because *two* processes (backend and
  indexer) write/read this schema and must never disagree about its shape.
- Prisma Migrate's generated, reviewable SQL migration files fit this
  project's "migrations are the only path, including in production" rule
  (see [Database Design §6](../07-database-design.md)) better than
  TypeORm's synchronize-or-hand-write-migration split.
- Prisma Client's generated types flow cleanly into the Clean Architecture
  boundary: infrastructure-layer repositories use Prisma types internally
  and map to domain entities at the port boundary (see
  [Backend Design §2](../05-backend-design.md)) — Prisma's generated types
  are good "infrastructure detail" types precisely because nothing outside
  the infrastructure layer imports them.

## Consequences

- `apps/backend/prisma/schema.prisma` is shared (via a generated client
  package) with `apps/indexer`, since both need to write to overlapping
  tables — the indexer does not maintain its own separate schema/migration
  history.
- Backend and indexer must be deployed with compatible Prisma Client
  versions against the same migrated schema — a version-skew risk noted
  explicitly for the deploy runbook (see
  [DevOps & CI/CD §4](../11-devops-cicd.md)).
