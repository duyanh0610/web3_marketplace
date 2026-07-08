# Milestone 3 — Metadata & IPFS Pipeline

## Goal

An upload pipeline that pins an image and OpenSea-compatible metadata JSON
to IPFS via Pinata, returning a `tokenURI` usable by the mint flow.

## Knowledge Required

- IPFS content addressing (CIDs), Pinata API/SDK.
- NestJS file upload handling (`multipart/form-data`), BullMQ basics.
- OpenSea metadata JSON standard.

## Tasks

1. Backend: `POST /metadata/upload` REST controller (see
   [API Specification §2](../12-api-specification.md)) — accepts image +
   metadata fields, validates (file size/type, required fields).
2. Backend: Pinata client adapter (infrastructure layer) — pin image, build
   metadata JSON (name, description, image CID, attributes, plus a
   convenience royalty field for indexer/UI use, per
   [Business Requirements §F3](../02-business-requirements.md)), pin
   metadata JSON.
3. Backend: `metadata-pin` BullMQ queue + worker for retry-on-failure (pin
   failures shouldn't be a synchronous user-facing error if retryable).
4. Backend: Pinata webhook receiver (`POST /webhooks/pinata`) for async
   pin-status confirmation, signature-verified.
5. Tests: adapter unit tests (mocked Pinata HTTP calls) for success,
   timeout, and retry-then-succeed paths; controller validation tests for
   oversized/invalid uploads.

## Acceptance Criteria

- [ ] Uploading a real image + metadata form produces a resolvable
      `ipfs://<CID>` that renders correctly via a public IPFS gateway.
- [ ] Metadata JSON validates against the OpenSea metadata standard
      (checked manually against OpenSea's testnet metadata validator or
      equivalent).
- [ ] A simulated Pinata failure (adapter test double returns an error)
      triggers a retried job, not a lost upload.
- [ ] Oversized or wrong-content-type uploads are rejected with a clear
      error before any Pinata call is attempted.

## Definition of Done

- All Acceptance Criteria checked.
- Retry/failure-path tests pass, not just the happy path.
- `.env.example` documents `PINATA_API_KEY`/`PINATA_SECRET` requirements.

## Risks

| Risk | Mitigation |
|---|---|
| Pinata rate limits or downtime during demo/interview | BullMQ retry with backoff; document fallback (manual re-pin) in a short runbook note |
| Large image uploads slow the mint UX | Client-side image size/type validation before upload starts, clear progress indication in the frontend (implemented in Milestone 7) |

## Suggested Commit Plan

1. `feat(backend): add metadata upload REST endpoint with validation`
2. `feat(backend): implement pinata adapter for image + metadata pinning`
3. `feat(backend): add metadata-pin bullmq queue with retry`
4. `feat(backend): add pinata webhook receiver for pin-status callbacks`
5. `test(backend): cover pinata adapter success/failure/retry paths`
