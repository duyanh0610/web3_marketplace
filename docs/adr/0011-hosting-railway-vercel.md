# ADR-0011: Hosting (Railway + Vercel)

**Status:** Accepted

## Context

The original blueprint listed "AWS or Railway" without deciding between
them. Need hosting for: backend (NestJS), indexer (long-running Node
process), PostgreSQL, Redis, and the Next.js frontend.

## Decision

**Railway** for backend, indexer, PostgreSQL, and Redis. **Vercel** for the
Next.js frontend.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **AWS (ECS/RDS/ElastiCache, etc.)** | The "real startup at scale" choice, and worth knowing — but its setup cost (VPC, IAM, ECS task definitions, RDS parameter groups) is disproportionate to a solo-developer, testnet-only, portfolio-scale deployment. Documented here as the explicit future migration target if this project ever needs to demonstrate infra-at-scale skills or handle real production load. |
| **Self-hosted VPS (e.g. a single DigitalOcean droplet running Docker Compose)** | Cheaper at small scale and a reasonable alternative, but loses managed Postgres/Redis backups, zero-downtime deploys, and preview environments that Railway provides out of the box — the ops-babysitting time cost isn't worth it for this project's goals. |
| **Vercel for backend too (serverless functions)** | NestJS's request lifecycle and the indexer's long-running, stateful (WebSocket subscription, in-memory batch processing) nature don't fit a serverless function model well; Vercel remains frontend-only. |

## Decision Drivers

- Railway gives managed Postgres/Redis, simple environment-per-branch
  config, and straightforward long-running-process hosting (needed for the
  indexer's persistent RPC WebSocket subscription) with minimal setup.
- Vercel is effectively the default for Next.js (made by the same company,
  first-class preview deployments per PR) — no reason to deviate for the
  frontend specifically.
- Both integrate directly with GitHub, keeping the CI/CD pipeline
  (see [DevOps & CI/CD](../11-devops-cicd.md)) simple.

## Consequences

- Production and staging are separate Railway environments/projects, not
  just separate env vars in one environment — full isolation of
  DB/Redis/secrets per environment.
- If this project later needs to demonstrate AWS/infra-at-scale skills,
  that should be a new ADR (a migration, not a silent addition), since it
  changes the deployment runbook in
  [DevOps & CI/CD §4](../11-devops-cicd.md) materially.
