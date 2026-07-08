# ADR-0004: Hybrid Contract Testing (Hardhat + Foundry)

**Status:** Accepted

## Context

The project's business requirements (per the original blueprint) explicitly
call for fuzz and invariant testing on the smart contracts, alongside
unit/integration/fork testing. [ADR-0003](./0003-smart-contract-framework.md)
picked Hardhat as the primary framework for approachability, but Hardhat has
no native fuzzing/invariant-testing engine comparable to Foundry's
`forge test --fuzz` and invariant runner.

## Decision

Keep **Hardhat as the primary framework** for all unit/integration tests,
deployment scripts, and day-to-day development. Introduce **Foundry**
narrowly, scoped specifically to fuzz and invariant tests on the two
contracts where they matter most (`Marketplace`, `Auction`), starting in the
[Security Hardening milestone](../milestones/milestone-09-security-hardening.md)
— not from project inception.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **Foundry only** | Rejected in [ADR-0003](./0003-smart-contract-framework.md) — steeper ramp for a TS-background learner. |
| **Skip fuzz/invariant testing entirely** | Rejected — the blueprint explicitly calls for it, and these are exactly the test types most likely to catch the subtle payment-splitting/reentrancy bugs this project cares most about (see [Security Model](../09-security-model.md)). Dropping them silently would be scope-cutting without surfacing the trade-off, which the project's own guiding principles rule out. |
| **Hand-roll property-based tests in Hardhat using `fast-check`** | Possible, but reinvents a weaker version of what Foundry already does well (shrinking, stateful invariant call-sequence generation) — not a good use of effort relative to just learning Foundry's fuzz/invariant syntax for the ~2 contracts that need it. |

## Decision Drivers

- Introducing Foundry **after** the contracts' core behavior is already
  covered by Hardhat unit tests means the Solidity-test-syntax learning
  curve is tackled once the underlying contract logic is already
  well-understood — a smaller cognitive load than learning Solidity,
  Hardhat, and Foundry all simultaneously at project start.
- Scoping Foundry to exactly two contracts (the ones that move money) keeps
  the second toolchain's maintenance surface small.

## Consequences

- `apps/contracts` will contain both a Hardhat config and a `foundry.toml`
  + `test/*.t.sol` fuzz/invariant test files, introduced together in
  Milestone 9.
- CI gains a Foundry job (`forge test`) alongside the existing Hardhat job,
  gated to run whenever `apps/contracts` changes (see
  [DevOps & CI/CD §3](../11-devops-cicd.md)).
- The two flagship invariants to implement are specified in
  [Security Model §2](../09-security-model.md) — this ADR doesn't repeat
  them to avoid duplication drifting out of sync.
