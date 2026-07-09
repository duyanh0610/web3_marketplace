# Architecture Decision Records

Each ADR records a decision, the alternatives considered, and the trade-off
that made this project pick one over the others. Status is one of
`Proposed`, `Accepted`, `Superseded`. All ADRs below are `Accepted` as of
the initial documentation pass (2026-07-08) unless noted.

| # | Title | Decision (short) |
|---|---|---|
| [0001](./0001-monorepo-tooling.md) | Monorepo Tooling | Turborepo + pnpm workspaces |
| [0002](./0002-blockchain-network-and-environment.md) | Blockchain Network & Environment | Ethereum Sepolia testnet only, no mainnet in Phase 1 |
| [0003](./0003-smart-contract-framework.md) | Smart Contract Framework | Hardhat (TypeScript) + ethers v6 for scripts/tests |
| [0004](./0004-testing-tool-hybrid-hardhat-foundry.md) | Hybrid Contract Testing | Hardhat primary, Foundry added narrowly for fuzz/invariant tests |
| [0005](./0005-upgradeable-contracts-uups.md) | Upgradeable Contracts | UUPS proxies from day one, gated by multisig + timelock |
| [0006](./0006-database-orm-choice.md) | Database & ORM | PostgreSQL + Prisma |
| [0007](./0007-event-driven-indexer-architecture.md) | Event-Driven Indexer Architecture | Dedicated indexer service, chain is source of truth |
| [0008](./0008-graphql-vs-rest.md) | GraphQL vs REST | GraphQL primary API, REST only for health/auth/upload/webhooks |
| [0009](./0009-authentication-siwe.md) | Authentication | SIWE (EIP-4361) + short-lived JWT |
| [0010](./0010-nft-metadata-storage-ipfs.md) | NFT Metadata Storage | IPFS via Pinata |
| [0011](./0011-hosting-railway-vercel.md) | Hosting | Railway (backend/indexer/DB/Redis) + Vercel (frontend) |
| [0012](./0012-phase2-scope-deferral.md) | Phase 2 Scope Deferral | DAO/Membership/ERC-20/Embedded Wallet/Admin/Explorer/Notifications deferred to Phase 2 |
| [0013](./0013-frontend-i18n.md) | Frontend Internationalization | Custom React Context + JSON dictionaries, no URL locale routing, English default |
