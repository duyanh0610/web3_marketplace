# 09 — Security Model

## 1. Threat Model Summary

| Asset | Threat | Primary mitigation |
|---|---|---|
| NFTs held by users | Reentrancy drain during buy/settle | Checks-effects-interactions + `ReentrancyGuard` + pull-payments |
| Marketplace fee/royalty funds | Fund lock via malicious `receive()` fallback | Pull-payment pattern (never push-send to arbitrary addresses in a state-changing path) |
| Contract upgrade path | Malicious/rushed upgrade | Multisig (Gnosis Safe) + `TimelockController` gating `_authorizeUpgrade`; storage-layout CI check |
| User sessions | SIWE nonce replay / session fixation | Single-use nonce with TTL, bound to the signing address, JWT with short expiry |
| IPFS metadata | Tampered metadata after mint | `tokenURI` is immutable per token (or re-settable only by owner with an event trail); frontend renders directly from the CID, not a mutable pointer |
| Indexer data integrity | Reorg causing stale/incorrect projection | Confirmation depth + reorg detection/rewind (see [Blockchain Indexer §4](./08-blockchain-indexer.md)) |
| RPC provider | Single point of failure / feeding bad data | Primary + fallback RPC provider config; indexer treats RPC responses as untrusted input (validates against expected chain ID, block continuity) |

## 2. Smart Contract Security Checklist

Applied to every contract before it is considered done (checked in the
Security Hardening milestone, but designed-in from the first line of code):

- [ ] **Checks-Effects-Interactions** in every function with an external call.
- [ ] **`ReentrancyGuard`** (`nonReentrant`) on every function that sends
      value or calls an external contract that could call back.
- [ ] **Pull over push** for all payments (`pendingWithdrawals` ledger +
      `withdraw()`, never `.transfer()`/`.call()` to a user-supplied address
      inside a state-changing function other than `withdraw()` itself).
- [ ] **Access control**: `Ownable`/`AccessControl` on every privileged
      function (pause, fee config, upgrade authorization); no `tx.origin`
      checks anywhere.
- [ ] **Pausable** emergency stop on mint/transfer/list/buy/bid paths,
      owner (multisig)-gated.
- [ ] **Integer handling**: Solidity ^0.8.x (built-in overflow/underflow
      checks) — no `unchecked` blocks except in a reviewed, commented,
      justified hot path (none expected in Phase 1).
- [ ] **Signature replay**: any EIP-712/SIWE signature includes a nonce and
      a domain separator (chain ID + contract address) so a signature
      cannot be replayed cross-chain or cross-contract.
- [ ] **Front-running / MEV awareness**: `buy()` re-validates
      price/ownership atomically at execution time rather than trusting a
      stale quote (see [Smart Contract Design §4](./04-smart-contract-design.md));
      auction bids strictly increasing removes any front-running advantage
      beyond normal gas-price competition, which is accepted as an
      out-of-scope L1/L2-level concern for Phase 1.
- [ ] **Oracle manipulation**: N/A in Phase 1 — no price oracle is used
      (fixed price set by seller, auction price set by market). Revisit if
      Phase 2's ERC-20 payment feature introduces any conversion pricing.
- [ ] **Upgrade storage-layout safety**: enforced by
      `@openzeppelin/hardhat-upgrades` validation in CI (see
      [Smart Contract Design §2](./04-smart-contract-design.md)).
- [ ] **Static analysis**: Slither run in CI on every PR touching
      `apps/contracts`; high/medium findings block merge unless explicitly
      annotated with a reviewed suppression comment explaining why it's a
      false positive.
- [ ] **Fuzz & invariant testing** on `Marketplace`/`Auction` (Foundry,
      introduced in the Security Hardening milestone — see
      [ADR-0004](./adr/0004-testing-tool-hybrid-hardhat-foundry.md)):
      invariants such as "sum of `pendingWithdrawals` + contract ETH balance
      reserved for active listings never exceeds the contract's actual ETH
      balance" and "a `Listing` can never be `SOLD` while its NFT's current
      owner differs from the recorded seller."

## 3. Admin Key Management

- Contract ownership is a **Gnosis Safe** (2-of-3 in Phase 1 — the author
  plus two hardware-wallet-held keys, or two personal wallets if working
  solo, documented per-deployment in `infrastructure/`), never a single EOA,
  from the first Sepolia deployment.
- Upgrades and privileged config changes (fee %, pause) go through a
  `TimelockController` with a minimum delay (e.g. 24h even on testnet, to
  practice the real workflow) — proposed by the Safe, executed after delay.
- No private key for any admin role is ever committed to the repo or CI
  secrets in plaintext form usable for mainnet; Sepolia-only test keys used
  in CI are documented as such and rotated if ever exposed.

## 4. Backend/API Security

- **AuthN**: SIWE + short-lived JWT (see
  [ADR-0009](./adr/0009-authentication-siwe.md)); refresh via re-signing,
  not long-lived refresh tokens, given the low-friction nature of wallet
  signing.
- **AuthZ**: GraphQL field/resolver guards ensure a user can only mutate
  data tied to their own authenticated address (e.g., cannot cancel another
  address's listing at the API layer — though the contract itself is the
  real enforcement backstop, since the API never signs transactions).
- **Input validation**: all GraphQL inputs validated via `class-validator`
  DTOs at the presentation boundary; domain layer trusts its own invariants
  once past that boundary (no redundant re-validation deeper in the stack).
- **Rate limiting**: on SIWE nonce issuance and any mutation resolver, to
  blunt basic abuse.
- **Secrets**: Pinata API key, RPC provider keys, DB/Redis credentials via
  environment variables injected by Railway, never committed; `.env.example`
  documents required vars with placeholder values only.

## 5. Frontend Security

- No private keys ever touch frontend code beyond what the wallet extension
  manages.
- Content rendered from IPFS (NFT metadata/images) is treated as
  **untrusted user input** — sanitized before rendering (no raw HTML from
  metadata fields), image `src` restricted to the configured IPFS gateway.
- SIWE sign-in message is rendered to the user in full before signing (no
  blind signing prompts) — RainbowKit/wagmi default flow already does this
  correctly; verified explicitly as an acceptance check in
  [Milestone 1](./milestones/milestone-01-wallet-authentication.md).

## 6. What's Explicitly Out of Scope for a Portfolio Project

- Formal third-party audit (cost-prohibitive for a personal project) —
  substituted with Slither + fuzz/invariant testing + a self-review
  checklist pass, documented as such rather than implied to be
  audit-equivalent.
- Bug bounty program.
- Mainnet-grade key custody (HSM, MPC custody providers) — Sepolia-only
  scope makes a Gnosis Safe with hardware-wallet signers sufficient.
