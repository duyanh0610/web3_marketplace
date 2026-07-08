# 14 — Coding Guidelines

These apply on top of (never in place of) the root `CLAUDE.md` behavioral
guidelines (think before coding, simplicity first, surgical changes,
goal-driven execution). Where this file and the root guidelines overlap,
the root guidelines are the tie-breaker.

## 1. TypeScript (backend, frontend, indexer — shared)

- Strict mode on (`strict: true`) in every `tsconfig.json`. No `any` without
  an inline comment explaining why it's unavoidable (e.g. a loosely-typed
  third-party callback).
- No default exports — named exports only, for consistent
  refactor-friendly imports across the monorepo.
- Domain/application layers (backend) never import from `infrastructure` or
  `presentation` — enforced by `eslint-plugin-boundaries` or equivalent
  per-module `import` restrictions (see [Backend Design §3](./05-backend-design.md)).
- Money/value amounts are always `bigint` or a `Wei` value object wrapping a
  `bigint` — never `number` — anywhere a wei-precision value could appear,
  end to end (contracts' ABI decode → indexer → DB `numeric` → GraphQL
  `Wei` scalar → frontend).
- Prefer `Result<T, E>`-style returns or typed thrown errors over
  `null`/`undefined` sentinels for expected failure cases in the domain
  layer; reserve exceptions for truly exceptional/unexpected states.

## 2. Solidity (`apps/contracts`)

- Style: Solhint with the OpenZeppelin-recommended ruleset.
- NatSpec (`@notice`/`@param`/`@return`) required on every external/public
  function — this is user-facing documentation (Etherscan renders it) and
  interview-facing documentation, not optional.
- No inline "magic number" fee/bps constants — named constants
  (`MAX_FEE_BPS = 500`) with a comment stating the reasoning if the number
  itself isn't self-evident.
- Every state-changing external function states its
  checks-effects-interactions ordering is followed via comment only if the
  ordering isn't visually obvious from the code (per root guideline:
  comment the *why*, not the *what*).
- Upgradeable contracts: `initializer`/`reinitializer` modifiers, storage
  gaps, and `_disableInitializers()` in the constructor are non-negotiable,
  checked in code review (see [Smart Contract Design §2](./04-smart-contract-design.md)).

## 3. NestJS Conventions

- One module per bounded context (see [Backend Design §3](./05-backend-design.md));
  a module's Prisma models are never imported directly by another module.
- Resolvers/controllers are thin: input parsing + one use-case call + output
  mapping. No business logic in a resolver.
- DTOs (`class-validator`) at every external input boundary; domain
  entities are never the same class as a GraphQL `@ObjectType` DTO (mapping
  is explicit, even though it's a bit more code — keeps domain logic
  framework-free).

## 4. React / Next.js Conventions

- Server Components by default; `"use client"` only where wallet/browser
  APIs are required (see [Frontend Design §2](./06-frontend-design.md)).
- Feature-sliced folders (`features/<name>`) mirror backend module
  boundaries; a feature folder owns its own components, hooks, and GraphQL
  documents.
- No prop-drilling wallet/session state more than one level — use context
  (wagmi's own provider tree) rather than threading props through
  intermediate components that don't use them.

## 5. Git & Commit Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`) —
  milestone docs' "Suggested commit plan" sections use this format.
  Commit messages state *why*, matching this repo's own root
  `CLAUDE.md` guidance to focus on rationale over restating the diff.
- One logical change per commit; a milestone is typically many commits, not
  one giant commit at the end.
- No direct pushes to `main` — every milestone lands via a PR, even solo,
  so CI gates run and the PR description records the milestone's
  acceptance-criteria checklist.

## 6. Review Checklist (applies to every PR, any layer)

- [ ] Does this change trace to a specific milestone task (see
      `milestones/`)? No speculative/unscoped changes riding along.
- [ ] Are money/wei values `bigint` end-to-end, never `number`?
- [ ] If this touches a contract: storage layout check passed, NatSpec
      present, Slither clean (or suppression justified).
- [ ] If this touches the indexer or a payment path: is it idempotent /
      reentrancy-safe respectively?
- [ ] Tests added/updated for the behavior this PR changes (see
      [Testing Strategy](./10-testing-strategy.md)).
- [ ] Docs updated if this PR changes a decision recorded in an ADR or a
      design doc — a diverging doc is a bug, not a formality.
