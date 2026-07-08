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

[Milestone 0 — Foundations & Tooling](docs/milestones/milestone-00-foundations.md)
complete: monorepo tooling, all four apps scaffolded, local infra, and CI
are wired up and verified. Implementation proceeds one milestone at a time
— see [Milestone Roadmap](docs/15-milestone-roadmap.md) and
[docs/milestones/](docs/milestones/) for the current plan. Next up:
[Milestone 1 — Wallet Authentication](docs/milestones/milestone-01-wallet-authentication.md).

## Local Development

### Prerequisites

- Node.js `20.15.1` (see `.nvmrc`; `nvm use` if you have nvm installed)
- pnpm via Corepack: `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- Docker (for local Postgres/Redis)

### Setup

```bash
pnpm install

# Start Postgres + Redis
docker compose -f infrastructure/docker-compose.yml up -d

# Copy env files (each app has its own .env.example)
cp apps/backend/.env.example apps/backend/.env
cp apps/indexer/.env.example apps/indexer/.env
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/contracts/.env.example apps/contracts/.env
```

> Redis is mapped to host port `6380` (not `6379`) by default — see the
> comment in `infrastructure/docker-compose.yml`. Adjust `REDIS_URL` in
> your `.env` files if you change that mapping.
>
> The frontend requires a real WalletConnect Cloud project ID
> (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, free at
> [cloud.walletconnect.com](https://cloud.walletconnect.com)) for wallet
> connect to actually work — a placeholder value only unblocks the build.

### Common commands (run from repo root, via Turborepo)

```bash
pnpm build       # build all apps/packages
pnpm lint        # lint all apps/packages
pnpm typecheck   # typecheck all apps/packages
pnpm test        # test all apps/packages
```

### Running an individual app

```bash
pnpm --filter @we3/contracts run node   # local Hardhat node (localhost:8545)
pnpm --filter @we3/backend run start:dev
pnpm --filter @we3/indexer run dev
pnpm --filter @we3/frontend run dev     # http://localhost:3000
```
