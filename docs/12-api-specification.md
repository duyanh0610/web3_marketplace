# 12 — API Specification (REST surface)

GraphQL is the primary API (see [GraphQL Schema](./13-graphql-schema.md)).
REST is used only where GraphQL is the wrong tool: health checks, webhooks,
and file upload.

## 1. Conventions

- Base path: `/api/v1`.
- JSON request/response bodies; `Content-Type: application/json` except
  the upload endpoint (`multipart/form-data`).
- Auth: `Authorization: Bearer <jwt>` header, same JWT issued by the SIWE
  flow used for GraphQL.
- Errors: `{ "error": { "code": string, "message": string } }`, consistent
  with GraphQL's error `code` convention (see
  [Backend Design §8](./05-backend-design.md)).

## 2. Endpoints

### `GET /api/v1/health`
Liveness check. No auth. Returns `200 { status: "ok" }` if the process is
up (does not check DB/Redis — that's `/health/ready`).

### `GET /api/v1/health/ready`
Readiness check for Railway/load balancer. Verifies DB and Redis
connectivity. Returns `200` or `503` with the failing dependency named.

### `POST /api/v1/auth/siwe/nonce`
Issues a single-use SIWE nonce for the requesting address.

Request:
```json
{ "address": "0xabc..." }
```
Response:
```json
{ "nonce": "a1b2c3...", "expiresAt": "2026-07-08T12:05:00Z" }
```

### `POST /api/v1/auth/siwe/verify`
Verifies a signed SIWE message, issues a session JWT.

Request:
```json
{ "message": "<EIP-4361 message>", "signature": "0x..." }
```
Response:
```json
{ "accessToken": "<jwt>", "expiresAt": "2026-07-08T13:00:00Z" }
```
Errors: `INVALID_SIGNATURE`, `NONCE_EXPIRED`, `NONCE_ALREADY_USED`.

### `POST /api/v1/metadata/upload`
Auth required. Accepts `multipart/form-data` with an image file and a JSON
metadata payload (name, description, attributes). Uploads the image to
IPFS, builds the OpenSea-compatible metadata JSON referencing the image
CID, uploads that too, and returns both CIDs. Used by the frontend mint
flow before calling `mint()` on-chain (see
[Frontend Design §6](./06-frontend-design.md)).

Response:
```json
{ "imageCid": "bafy...", "metadataCid": "bafy...", "tokenUri": "ipfs://bafy..." }
```

### `POST /api/v1/webhooks/pinata`
Internal webhook receiver for Pinata pin-status callbacks (used by the
`metadata-pin` BullMQ job for async retry on pin failure — see
[Backend Design §7](./05-backend-design.md)). Verified via a shared-secret
signature header; not part of the public API surface.

## 3. Explicitly Not REST

Listings, auctions, catalog browsing, sales history — all GraphQL. A
second, parallel REST surface for the same data would be pure duplication
with no benefit; see [ADR-0008](./adr/0008-graphql-vs-rest.md).
