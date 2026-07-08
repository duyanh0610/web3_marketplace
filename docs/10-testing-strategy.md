# 10 — Testing Strategy

## 1. Principle

Every layer is tested at the level where a bug is cheapest to catch. Domain
logic (fee splits, state machines) is unit-tested with no I/O; integration
points (DB, chain, Redis) are tested against real local instances (Hardhat
node, Dockerized Postgres/Redis), never mocked to the point of testing the
mock instead of the behavior.

## 2. Smart Contracts (`apps/contracts`)

| Test type | Tool | What it covers |
|---|---|---|
| Unit | Hardhat + Chai/Mocha (TypeScript), `ethers` v6 | Individual function behavior, revert conditions, event emission, access control |
| Integration | Hardhat, multi-contract scenarios on an in-memory Hardhat network | Full mint → list → buy flow; upgrade-then-call-old-function-still-works |
| Fork testing | Hardhat mainnet-fork (against Sepolia state where relevant, e.g. testing against a real Gnosis Safe deployment) | Realistic environment checks without deploying to a live testnet for every run |
| Fuzz | Foundry (`forge test --fuzz`) | Property checks on `Marketplace`/`Auction` — e.g. "for any price/fee/royalty combination within valid bounds, the sum of splits equals the sale price exactly, no wei lost or double-counted" |
| Invariant | Foundry invariant testing | System-wide invariants across randomized call sequences (see [Security Model §2](./09-security-model.md) for the two flagship invariants) |
| Static analysis | Slither (CI) | Known vulnerability patterns, informational best-practice deviations |

Coverage target: 100% branch coverage on `Marketplace` and `Auction`
(the value-handling contracts); `MarketplaceNFT` held to a slightly lower
bar since most of its logic is inherited OpenZeppelin code.

Foundry is introduced specifically for fuzz/invariant testing (see
[ADR-0004](./adr/0004-testing-tool-hybrid-hardhat-foundry.md)) — Hardhat
remains the primary framework for everything else (deployment scripts,
day-to-day unit/integration tests), matching the TypeScript-native tooling
decision.

## 3. Backend (`apps/backend`)

| Test type | Tool | Scope |
|---|---|---|
| Unit | Jest | Domain entities/services (pure functions), use cases with hand-written in-memory fakes for repository ports |
| Integration | Jest + Testcontainers (or Docker Compose) Postgres/Redis | Prisma repositories against a real Postgres instance; Redis pub/sub round-trip |
| Resolver/e2e (API) | Jest + `supertest` against an in-process Nest app | GraphQL queries/mutations end-to-end through the real module graph, DB seeded per test |
| Contract-boundary tests | Jest against a local Hardhat node | Anything that reads on-chain state directly (rare, see [Backend Design §5](./05-backend-design.md)) |

Use cases are tested against **fakes**, not mocking frameworks, for
repository ports (an in-memory `Map`-backed implementation of
`ListingRepository`) — faster, and avoids tests that just re-assert mock
call arguments instead of behavior.

## 4. Indexer (`apps/indexer`)

- Unit tests for event decoding and projection-mapping logic (pure
  functions: raw log → projection diff).
- Integration tests against a local Hardhat node: deploy contracts, emit
  real events by calling real functions, assert the indexer produces the
  correct DB rows and Redis messages.
- **Reorg simulation test**: deliberately fork/revert a local Hardhat chain
  mid-indexing and assert the indexer detects the mismatch and rewinds
  correctly (see [Blockchain Indexer §4](./08-blockchain-indexer.md)) — this
  is a required test, not a nice-to-have, since reorg handling is the
  riskiest untested-by-default code path in an indexer.

## 5. Frontend (`apps/frontend`)

| Test type | Tool | Scope |
|---|---|---|
| Unit | Vitest + React Testing Library | Component logic, hooks (e.g. transaction-state-machine hooks) with wagmi mocked at the hook boundary |
| E2E | Playwright, against a local stack (Hardhat node + seeded backend) with a test wallet (viem's local account, injected via a test-only wallet provider) | Full golden path: connect → mint → list → (second browser context) buy → see updated state |

Playwright is added beyond the blueprint's original Vitest-only plan
specifically to exercise real wallet-signing flows end-to-end — unit tests
alone cannot catch a broken wagmi config or a misrouted contract address.

## 6. CI Gates

No PR merges unless, for the parts of the monorepo it touches:

1. Lint passes (ESLint + Solhint for contracts).
2. Type-check passes (`tsc --noEmit`).
3. Unit + integration tests pass.
4. Slither has no new high/medium findings (contracts only).
5. For `apps/contracts` changes specifically: fuzz/invariant suite passes
   (runs on every PR once introduced in the Security Hardening milestone;
   before that, runs as part of that milestone's own CI job only).

Full pipeline definition in [DevOps & CI/CD](./11-devops-cicd.md).

## 7. What Is Not Tested (and why that's fine)

- Third-party infra (Pinata, Alchemy/Infura RPC, Railway, Vercel) —
  integration with them is tested via thin adapter contract tests against
  their real (testnet/sandbox) APIs, not reimplemented/mocked in detail.
- OpenZeppelin base contract internals — trusted, audited dependency; tests
  focus on this project's usage of them (correct initialization, correct
  access control wiring), not re-verifying OpenZeppelin's own test suite.
