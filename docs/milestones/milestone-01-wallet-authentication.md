# Milestone 1 — Wallet Authentication (SIWE)

## Goal

A user can connect a wallet in the frontend and sign in via SIWE, receiving
a backend-issued session used to authenticate subsequent GraphQL requests.

## Knowledge Required

- EIP-4361 (SIWE) message format and verification flow.
- JWT issuance/verification, NestJS Guards.
- wagmi/RainbowKit connect flow and message signing (`useSignMessage`).

## Tasks

1. Backend: `AuthModule` — domain (SIWE message construction/validation
   rules), application (`RequestNonceUseCase`, `VerifySiweUseCase`),
   infrastructure (Prisma-backed nonce store, JWT signing via
   `@nestjs/jwt`), presentation (`POST /auth/siwe/nonce`,
   `POST /auth/siwe/verify` REST controllers — see
   [API Specification](../12-api-specification.md)).
2. Backend: JWT auth guard usable by both REST and GraphQL resolvers;
   `me` query resolver (see [GraphQL Schema §3](../13-graphql-schema.md)).
3. Database: `ACCOUNT` and `SIWE_SESSION` (nonce) tables + Prisma migration.
4. Frontend: RainbowKit `ConnectButton`, custom sign-in flow calling
   `/auth/siwe/nonce` → build SIWE message (`siwe` npm package) → sign via
   wagmi → `/auth/siwe/verify` → store JWT (httpOnly cookie or in-memory +
   refresh-on-reload strategy — decide and document at implementation time).
5. Frontend: auth context/provider exposing `isAuthenticated`, `address`,
   `signIn`, `signOut` to the rest of the app.
6. Tests: backend unit tests for nonce single-use/expiry and signature
   verification (valid, invalid, expired, replayed cases); frontend
   component test for the connect → sign → authenticated state transition.

## Acceptance Criteria

- [ ] Connecting a wallet and clicking "Sign In" produces a full SIWE
      message shown by the wallet for approval (no blind signing).
- [ ] A valid signature results in an authenticated session; `me` query
      returns the connected address.
- [ ] A reused nonce is rejected (`NONCE_ALREADY_USED`).
- [ ] An expired nonce is rejected (`NONCE_EXPIRED`).
- [ ] An invalid signature is rejected (`INVALID_SIGNATURE`).
- [ ] Disconnecting the wallet clears the frontend session state.

## Definition of Done

- All Acceptance Criteria checked, verified manually against a real
  MetaMask (or equivalent) wallet on Sepolia, not only via automated tests.
- Unit test coverage for the nonce/signature edge cases listed above.
- [Security Model §4](../09-security-model.md) checklist items relevant to
  auth (rate limiting on nonce issuance, short JWT expiry) implemented.

## Risks

| Risk | Mitigation |
|---|---|
| Nonce store growing unbounded if users abandon sign-in mid-flow | TTL-based cleanup job (or a scheduled `DELETE WHERE expiresAt < now()`) |
| Frontend session storage choice (cookie vs memory) affects XSS/CSRF exposure differently | Decide explicitly and document the choice's trade-off in this file once implemented, rather than defaulting silently |

## Suggested Commit Plan

1. `feat(backend): add ACCOUNT and SIWE_SESSION prisma models + migration`
2. `feat(backend): implement SIWE nonce issuance and verification use cases`
3. `feat(backend): add JWT auth guard and me query resolver`
4. `feat(frontend): add wallet connect + SIWE sign-in flow`
5. `feat(frontend): add auth context and authenticated route guarding`
6. `test(backend): cover nonce replay/expiry/invalid-signature cases`
