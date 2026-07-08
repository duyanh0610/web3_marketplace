# ADR-0001: Monorepo Tooling

**Status:** Accepted

## Context

The project has four apps (`frontend`, `backend`, `indexer`, `contracts`)
that share artifacts: contract ABIs/addresses, GraphQL types, lint/TS
config. They need independent build/test/deploy but coordinated versioning
of shared packages, and CI should not rebuild/retest everything on every
change.

## Decision

Use **Turborepo** with **pnpm workspaces**.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **Nx** | More powerful (generators, richer dependency graph visualization, plugin ecosystem for many frameworks) but heavier configuration surface and steeper learning curve for a solo project; its extra power (monorepo-scale codegen, enterprise-scale caching/distribution) isn't needed at this project's size. |
| **Plain npm/pnpm workspaces, no task runner** | No caching or affected-graph awareness — every CI run would lint/test/build everything, slow and wasteful even at 4 apps + a few packages. |
| **Lerna** | Largely superseded by Nx/Turborepo for build orchestration; mainly relevant for multi-package publishing workflows this project doesn't need (nothing here is published to npm). |

## Decision Drivers

- Turborepo's `turbo.json` task pipeline + remote/local caching directly
  solves the "don't rebuild what didn't change" problem with a small
  config file.
- pnpm workspaces give strict, disk-efficient dependency isolation between
  apps (no phantom dependencies from a flat `node_modules`), which matters
  here because `apps/contracts` (Hardhat/Solidity tooling) and
  `apps/frontend` (Next.js) have very different, easily-conflicting
  dependency trees.
- Turborepo's authors (Vercel) also make Next.js — tooling friction for the
  frontend app specifically is minimal.

## Consequences

- Shared packages (`packages/contracts-abi`, `packages/graphql-types`,
  `packages/config`) are introduced in [Milestone 0](../milestones/milestone-00-foundations.md).
- CI pipeline (see [DevOps & CI/CD §3](../11-devops-cicd.md)) runs
  `turbo run lint test build --filter=...[origin/main]` so only affected
  packages are processed per PR.
- Trade-off accepted: Turborepo's remote caching (Vercel Remote Cache) is a
  paid feature beyond a free tier; local caching alone is sufficient for a
  solo project and is what Phase 1 relies on.
