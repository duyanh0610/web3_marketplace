# 01 — Project Overview

## Vision

Build a production-grade Web3 NFT Marketplace, engineered the way a funded
startup would build one, as a portfolio project that demonstrates full-stack
blockchain engineering: modular upgradeable smart contracts, an event-driven
indexer, a Clean Architecture backend, and a modern dApp frontend.

The author is an experienced Node.js/NestJS/GraphQL/PostgreSQL/TypeScript
engineer learning blockchain development. Documentation and milestone
structure are written to teach the underlying blockchain concepts (why, not
just how) at every decision point.

## Goals

- Ship a working, deployed (Sepolia testnet) NFT marketplace: mint, list,
  buy, cancel, with royalties paid on secondary sales.
- Demonstrate industry-standard smart contract patterns: UUPS upgradeability,
  access control, reentrancy protection, pull-payments.
- Demonstrate an event-driven architecture where the blockchain is the source
  of truth and the backend maintains a queryable read model via a dedicated
  indexer — never a synchronous "read from chain on every request" design.
- Produce documentation (this set) rigorous enough to onboard a new engineer
  or to present in a technical interview.

## Non-Goals (explicitly out of scope for Phase 1)

- Mainnet deployment or handling of real economic value. All Phase 1 work
  targets **Ethereum Sepolia testnet** only (see
  [ADR-0002](./adr/0002-blockchain-network-and-environment.md)).
- Multi-chain support. Single network only until Phase 1 is complete and
  stable.
- DAO governance, membership NFTs, ERC-20 payment rails, embedded wallets,
  admin dashboard, an internal block explorer, and a notification system.
  These are real, valuable features and are fully scoped in
  [Phase 2 — Future Scope](./milestones/phase-2-future-scope.md), but are
  deliberately deferred so Phase 1 ships a coherent, complete product instead
  of many half-finished features. See
  [ADR-0012](./adr/0012-phase2-scope-deferral.md).

## Guiding Principles

1. **Blockchain is the source of truth.** The backend and its database are a
   read-optimized cache/projection of on-chain state, never the other way
   around. Nothing the backend stores can contradict the chain; if it does,
   the indexer has a bug.
2. **Contracts are boring on purpose.** Favor audited OpenZeppelin primitives
   over custom cryptography or novel mechanisms. Novelty in a portfolio
   project should show up in architecture and completeness, not in
   reinvented security primitives.
3. **Every non-obvious decision has a written rationale.** See `adr/`. If you
   are about to make an architectural choice with more than one reasonable
   option, write the ADR before writing the code.
4. **One milestone at a time.** Documentation is complete before
   implementation starts; each milestone is fully shippable (deployed,
   tested, documented) before the next begins.

## Glossary

| Term | Meaning |
|---|---|
| **UUPS** | Universal Upgradeable Proxy Standard (EIP-1822) — upgrade logic lives in the implementation contract, not the proxy, saving gas and giving the implementation control over who can upgrade it. |
| **Indexer** | A dedicated off-chain service that subscribes to contract events, decodes them, and writes a normalized, queryable copy into PostgreSQL. |
| **SIWE** | Sign-In with Ethereum (EIP-4361) — a standard for wallet-based authentication without passwords. |
| **EIP-2981** | On-chain NFT royalty standard: contracts expose a `royaltyInfo()` view function marketplaces are expected to honor. |
| **Reorg** | Blockchain reorganization — a previously-accepted block is replaced by a competing chain. Indexers must handle this by re-validating recent blocks, not just appending. |
| **Pull payment** | A payment pattern where funds are credited to a withdrawable balance rather than pushed via a raw `.transfer()`/`.call()` inside another state-changing function, to avoid reentrancy and DoS-by-revert. |
| **Phase 1 / Phase 2** | Phase 1 = the committed, fully-specified MVP (this milestone roadmap). Phase 2 = additional features intentionally deferred, documented at a lighter level of detail. |

## Target Audience for This Documentation

- **You (the author)**, as the primary implementer, learning blockchain
  concepts through a realistic system.
- **A technical interviewer or reviewer**, evaluating architectural judgment,
  not just working code.
- **Future-you**, six months from now, who forgot why a decision was made.
