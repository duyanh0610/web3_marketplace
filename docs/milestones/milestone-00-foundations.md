# Milestone 0 — Foundations & Tooling

## Goal

Stand up the monorepo, tooling, and local dev environment so every
subsequent milestone starts from a working, consistent base — no app is
scaffolded ad hoc later.

## Knowledge Required

- pnpm workspaces, Turborepo basics (`turbo.json` pipeline config).
- Docker Compose fundamentals.
- Hardhat project init, NestJS CLI, Next.js `create-next-app`.
- GitHub Actions basics (workflow YAML syntax).

## Tasks

1. Initialize git repository (if not already), set up `.gitignore` for
   Node/Next/Hardhat/Prisma artifacts.
2. Configure pnpm workspaces (`pnpm-workspace.yaml`) covering `apps/*` and
   `packages/*`.
3. Configure Turborepo (`turbo.json`) with `build`/`test`/`lint`/`typecheck`
   pipelines and local caching.
4. Scaffold `packages/config` (shared ESLint + `tsconfig.base.json`),
   `packages/contracts-abi` (empty, populated starting Milestone 2),
   `packages/graphql-types` (empty, populated starting Milestone 6).
5. Scaffold `apps/contracts`: `npx hardhat init` (TypeScript), install
   `@openzeppelin/contracts-upgradeable`, `@openzeppelin/hardhat-upgrades`.
6. Scaffold `apps/backend`: NestJS CLI, install `@nestjs/graphql`,
   `apollo-server-express`, `prisma`, `@nestjs/config`.
7. Scaffold `apps/indexer`: plain TypeScript Node project (no framework),
   install `viem`, `@prisma/client`, `ioredis`.
8. Scaffold `apps/frontend`: `create-next-app` (TypeScript, App Router),
   install `wagmi`, `viem`, `@rainbow-me/rainbowkit`, `@tanstack/react-query`.
9. Write `infrastructure/docker-compose.yml`: Postgres 18 + Redis for local
   dev. **Deviation from the original plan**: a Hardhat local node is not
   containerized — it's a pure-JS dev tool with no system dependency,
   already available in the workspace via `pnpm --filter @we3/contracts run
   node`, so containerizing it would only add volume-mount/`node_modules`
   platform-mismatch complexity for no benefit. Run it alongside the
   Postgres/Redis stack with that command.
10. Write `.github/workflows/ci.yml`: lint + typecheck + test skeleton
    (jobs will gain real content as later milestones add tests).
11. Root `README.md` updated with local dev setup instructions
    (`docker compose up`, `pnpm install`, `pnpm dev`).

## Acceptance Criteria

- [ ] `pnpm install` at the repo root succeeds and installs all four apps'
      dependencies.
- [ ] `docker compose up` in `infrastructure/` brings up Postgres, Redis,
      and a local Hardhat node, all reachable on documented ports.
- [ ] `turbo run build` succeeds across all four apps (even if each app is
      just a scaffold with no real feature code yet).
- [ ] `turbo run lint` and `turbo run typecheck` pass with zero errors on
      the scaffolded code.
- [ ] A PR opened against `main` triggers the GitHub Actions CI workflow
      and it passes.

## Definition of Done

- All Acceptance Criteria checked.
- `docs/README.md`'s repository layout section matches reality (update if
  the actual scaffold diverged from what was documented).
- A new contributor (or future-you) can clone the repo and run the full
  local stack following only the root `README.md`.

## Risks

| Risk | Mitigation |
|---|---|
| Turborepo/pnpm workspace misconfiguration causes cross-app dependency resolution issues later | Validate early by having `apps/frontend` import a trivial export from `packages/config` before moving on |
| Docker Compose port conflicts with the developer's existing local services | Document all ports used in `infrastructure/docker-compose.yml` comments; make ports configurable via `.env` |

## Suggested Commit Plan

1. `chore: initialize pnpm workspace and turborepo config`
2. `chore: scaffold apps/contracts with hardhat and openzeppelin-upgrades`
3. `chore: scaffold apps/backend with nestjs and prisma`
4. `chore: scaffold apps/indexer as a standalone typescript service`
5. `chore: scaffold apps/frontend with nextjs, wagmi, rainbowkit`
6. `chore: add docker-compose for local postgres/redis/hardhat-node`
7. `ci: add github actions skeleton for lint/typecheck/build`
8. `docs: update README with local dev setup instructions`
