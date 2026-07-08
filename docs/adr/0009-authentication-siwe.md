# ADR-0009: Authentication (SIWE)

**Status:** Accepted

## Context

The marketplace needs to associate backend-side actions (e.g., "my
listings" queries, rate limiting) with a wallet address, without requiring
passwords/email for a wallet-native product.

## Decision

**Sign-In with Ethereum (EIP-4361, "SIWE")** as the authentication method,
issuing a short-lived JWT session after signature verification.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **Traditional email/password** | Contradicts the wallet-native UX this product is built around — a user with a wallet shouldn't need a second, separate identity system. |
| **Raw "sign this nonce" without the SIWE message standard** | SIWE (EIP-4361) exists precisely to standardize the message format (domain, chain ID, nonce, expiration) so wallets can render a clear, non-blind-signing prompt and so the message can't be replayed cross-domain/cross-chain — reinventing this ad hoc would reproduce a worse, non-standard version of it. |
| **Long-lived refresh tokens** | Rejected in favor of short-lived JWTs re-issued via a fresh SIWE sign whenever expired — wallet signing has low enough friction (no password to re-type) that a long-lived refresh token's main benefit (avoiding repeated logins) isn't worth the larger stolen-token blast radius. |

## Decision Drivers

- SIWE is the de facto standard for wallet auth across the dApp ecosystem
  (supported directly by RainbowKit) — using it is both the least-effort
  and the most-interoperable choice.
- Explicit, human-readable message content (no blind signing) is a security
  requirement carried through to the frontend — see
  [Security Model §5](../09-security-model.md).

## Consequences

- Backend issues single-use, TTL-bound nonces (`SIWE_SESSION` /
  `INDEXER_CURSOR`-adjacent table, see
  [Database Design §3](../07-database-design.md)) — replay of a used or
  expired nonce is rejected.
- JWT is the only session mechanism; no server-side session store beyond
  the nonce table (stateless verification per request via JWT signature).
