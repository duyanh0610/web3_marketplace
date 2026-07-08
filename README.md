# Web3 NFT Marketplace

Production-grade Web3 NFT Marketplace portfolio project: modular
upgradeable smart contracts (UUPS), an event-driven blockchain indexer, a
Clean Architecture NestJS/GraphQL backend, and a Next.js dApp frontend.
Deployed to **Ethereum Sepolia testnet** (see
[ADR-0002](docs/adr/0002-blockchain-network-and-environment.md)).

Documentation is written before implementation and is the source of truth
for architecture and scope — start at **[docs/README.md](docs/README.md)**.

## Structure

```
we3_marketplace/
├── apps/
│   ├── frontend/     # Next.js dApp (wagmi + viem + RainbowKit)
│   ├── backend/      # NestJS GraphQL API (Clean Architecture)
│   ├── indexer/      # Event-driven blockchain indexer
│   └── contracts/    # Hardhat: NFT, Marketplace, Auction (UUPS upgradeable)
├── docs/             # Engineering documentation (start here)
├── infrastructure/   # Docker Compose, deployment configs
├── scripts/          # Cross-cutting dev/ops scripts
└── README.md
```

## Status

Documentation phase complete. Implementation proceeds one milestone at a
time — see [Milestone Roadmap](docs/15-milestone-roadmap.md) and
[docs/milestones/](docs/milestones/) for the current plan, starting at
[Milestone 0 — Foundations & Tooling](docs/milestones/milestone-00-foundations.md).

## Local Development

Local dev setup (Docker Compose, pnpm/Turborepo commands) will be
documented here once [Milestone 0](docs/milestones/milestone-00-foundations.md)
is implemented.
