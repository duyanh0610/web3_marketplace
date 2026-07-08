# ADR-0003: Smart Contract Framework

**Status:** Accepted

## Context

Needed a primary Solidity development framework. The project owner is an
experienced Node.js/TypeScript engineer new to Solidity.

## Decision

**Hardhat**, with TypeScript tests (Chai/Mocha) and **ethers v6** for
deployment scripts and test-side contract interaction.

## Alternatives Considered

| Option | Why not chosen as primary |
|---|---|
| **Foundry (primary)** | Faster test execution and best-in-class fuzzing, and increasingly the production-team default in 2025+ — but tests are written in Solidity, which adds a second unfamiliar language on top of Solidity-the-contract-language itself, for someone already learning Solidity from a TS background. Steeper initial ramp. |
| **Both, fully parallel from day one** | Two toolchains to configure/maintain from the start increases setup friction before any contract code exists. Deferred — see [ADR-0004](./0004-testing-tool-hybrid-hardhat-foundry.md) for how Foundry is introduced later, narrowly. |
| **Truffle** | Effectively unmaintained relative to Hardhat/Foundry; no reason to pick it in 2026. |

## Decision Drivers

- Hardhat tests are TypeScript — the owner can apply existing NestJS/Jest-
  adjacent testing instincts directly to contract tests, lowering the
  learning curve for the *new* material (Solidity semantics, EVM behavior)
  by not also requiring a new testing language simultaneously.
- Hardhat's plugin ecosystem (`@openzeppelin/hardhat-upgrades` in
  particular) directly supports this project's UUPS + storage-layout-safety
  requirements (see [ADR-0005](./0005-upgradeable-contracts-uups.md)).
- `ethers v6` (not `viem`) specifically for Hardhat scripts/tests because
  it's Hardhat's long-standing default integration and most Hardhat
  plugin/tutorial content assumes it — reduces friction while learning.
  This does **not** conflict with the frontend's choice of `wagmi` + `viem`
  ([Frontend Design](../06-frontend-design.md)): these are separate
  processes (contract-repo tooling vs. browser dApp) that happen to use
  different Ethereum libraries, which is a common and unremarkable industry
  pattern, not an inconsistency to reconcile.

## Consequences

- `apps/contracts` is a Hardhat project (`hardhat.config.ts`), tests under
  `apps/contracts/test/*.test.ts`.
- Fuzz/invariant testing needs are met by introducing Foundry *in addition*
  later — see [ADR-0004](./0004-testing-tool-hybrid-hardhat-foundry.md) —
  rather than by trying to replicate that testing style in Hardhat/Chai.
