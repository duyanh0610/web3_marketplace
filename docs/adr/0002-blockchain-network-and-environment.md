# ADR-0002: Blockchain Network & Environment

**Status:** Accepted

## Context

Needed a target network for deployment throughout Phase 1. Options
discussed with the project owner: Polygon PoS, Base, Ethereum mainnet,
Ethereum Sepolia testnet, or a multi-chain approach.

## Decision

**Ethereum Sepolia testnet only.** No mainnet deployment, no L2, no
multi-chain, anywhere in Phase 1.

## Alternatives Considered

| Option | Why not chosen (for Phase 1) |
|---|---|
| **Polygon PoS (mainnet)** | Real gas costs and real economic value for a portfolio/learning project the owner explicitly does not want to fund with real money at this stage. |
| **Base / other L2 mainnet** | Same real-funds concern as Polygon; also adds bridging/L2-specific concepts (sequencer trust assumptions) that are a distraction from the core marketplace/indexer/UUPS learning goals. |
| **Multi-chain from day one** | Multiplies indexer complexity (per-chain cursors, per-chain RPC failover) and frontend chain-switching UX before a single-chain version even works. Explicitly rejected as premature per [Project Overview — Non-Goals](../01-project-overview.md). |
| **Ethereum mainnet** | Real funds; also the most expensive network to deploy/iterate on — directly conflicts with an iterative, upgrade-heavy Phase 1 (UUPS upgrades, redeploys during development). |

## Decision Drivers

- **Zero real economic exposure** while learning and iterating — testnet
  ETH is free (faucets), so redeploying, upgrading, and even intentionally
  triggering failure modes (e.g. testing a pause) carries no financial
  risk.
- Sepolia specifically (over other testnets like Goerli, which is
  deprecated/sunset) is the current Ethereum Foundation-recommended,
  actively-maintained public testnet as of this writing.
- Staying on Ethereum L1 (rather than an L2 testnet) keeps the mental model
  simplest: no sequencer, no bridge, no L2-specific gas quirks — appropriate
  for a project whose explicit goal is learning core blockchain/marketplace
  architecture, not L2 scaling technology.

## Consequences

- RPC provider: Alchemy or Infura Sepolia endpoint (with a fallback
  provider configured — see [DevOps & CI/CD §5](../11-devops-cicd.md)).
- Contract verification: Sepolia Etherscan.
- Gnosis Safe: deployed via Safe's Sepolia-supported UI/SDK.
- **This ADR is the one most likely to be revisited.** If/when this project
  moves toward a "real" deployment (Phase 2+ or beyond), a new ADR should
  supersede this one rather than silently changing network config —
  network choice touches RPC config, faucet-dependent test setup, and the
  Gnosis Safe deployment, so the change should be deliberate and recorded.
