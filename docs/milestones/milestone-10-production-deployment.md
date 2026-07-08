# Milestone 10 — Production Deployment

## Goal

The full stack (contracts on Sepolia, indexer + backend on Railway,
frontend on Vercel) live at a public URL, with monitoring/observability
wired, marking Phase 1 complete.

## Knowledge Required

- Railway/Vercel deployment configuration and environment management.
- Sentry setup for Node.js and Next.js.
- Basic production readiness practices (health checks, structured logging).

## Tasks

1. Provision Railway staging + production environments (backend, indexer,
   Postgres, Redis) and Vercel preview + production, per
   [DevOps & CI/CD §1](../11-devops-cicd.md).
2. Wire `.github/workflows/deploy-contracts.yml`,
   `deploy-backend.yml`, `deploy-frontend.yml` following the deployment
   order in [DevOps & CI/CD §4](../11-devops-cicd.md).
3. Configure Sentry for backend, indexer, and frontend.
4. Implement `HealthModule` (`/health`, `/health/ready`) and wire Railway
   health checks to it.
5. Implement the indexer-lag metric and drift-check job described in
   [DevOps & CI/CD §6](../11-devops-cicd.md).
6. Run the full staging deploy first; validate the Milestone 7 golden path
   (mint → list/auction → buy) against staging before promoting to
   production.
7. Promote to production; re-validate the golden path against the
   production URL.
8. Write a short operational runbook (`infrastructure/RUNBOOK.md`):
   rollback steps, where to find logs/errors, how to check indexer lag.

## Acceptance Criteria

- [ ] Frontend is reachable at a public Vercel production URL.
- [ ] Backend/indexer are healthy on Railway production, `/health/ready`
      returns 200.
- [ ] The full Phase 1 acceptance definition from
      [Business Requirements](../02-business-requirements.md#acceptance-definition-for-phase-1-complete)
      is demonstrated against the live production URL with two real
      wallets (not local test accounts).
- [ ] Sentry receives a deliberately-triggered test error from each of the
      three services (backend, indexer, frontend) during setup validation.
- [ ] Rolling back the frontend and backend to a previous deploy is
      demonstrated at least once (not just claimed to be possible).

## Definition of Done

- All Acceptance Criteria checked.
- `infrastructure/RUNBOOK.md` written and accurate.
- All ADRs and design docs reflect the actual deployed configuration
  (e.g. if any deploy-time decision diverged from
  [ADR-0011](../adr/0011-hosting-railway-vercel.md), that ADR is updated).
- Phase 1 formally marked complete in
  [Milestone Roadmap](../15-milestone-roadmap.md).

## Risks

| Risk | Mitigation |
|---|---|
| Environment variable drift between staging and production causes a production-only bug | Maintain a single `.env.example` per app as the checklist for what must be set in each environment; diff staging vs production env var *names* (not values) before promoting |
| First real production deploy surfaces an issue only visible under Railway/Vercel's actual runtime (vs local Docker Compose) | Staging deploy step (task 6) exists specifically to catch this before it reaches production |

## Suggested Commit Plan

1. `chore(infra): provision railway staging/production and vercel environments`
2. `ci: add deploy workflows for contracts, backend, frontend`
3. `feat(backend): add health and readiness endpoints`
4. `feat(indexer): add indexer-lag metric and drift-check job`
5. `chore(infra): configure sentry across backend, indexer, frontend`
6. `docs: add operational runbook`
