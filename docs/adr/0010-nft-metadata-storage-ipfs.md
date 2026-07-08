# ADR-0010: NFT Metadata Storage (IPFS)

**Status:** Accepted

## Context

Each NFT's `tokenURI` must resolve to metadata (name, description, image,
attributes) and, ideally, remain valid/available independent of this
project's own backend staying online forever — a core expectation for NFT
metadata in the wider ecosystem.

## Decision

Store NFT images and metadata JSON on **IPFS**, pinned via **Pinata** (a
pinning service, not a self-hosted IPFS node).

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **Store metadata in the backend's own PostgreSQL / S3, `tokenURI` points at a backend URL** | Cheapest/simplest, but ties an NFT's metadata availability to this specific backend staying online — directly against NFT ecosystem norms and against the project's "decentralization where it matters" positioning for a portfolio piece. |
| **Self-hosted IPFS node** | Removes the Pinata dependency, but adds real operational burden (node uptime, storage growth, peering) disproportionate to a portfolio project's needs; pinning-as-a-service exists precisely to avoid this. |
| **Arweave (permanent storage)** | Attractive "pay once, store forever" model, but adds a second storage paradigm/toolchain to learn for marginal benefit at Phase 1's scale; worth reconsidering if this project ever needs to guarantee permanence beyond what a maintained Pinata pin provides. |

## Decision Drivers

- IPFS + a pinning service is the overwhelming ecosystem norm for NFT
  metadata (OpenSea, most marketplaces) — following it means this
  project's metadata is portable and inspectable the way a reviewer would
  expect.
- Pinata's API is simple enough to wrap in a small backend adapter (see
  [API Specification §2](../12-api-specification.md), `POST /metadata/upload`)
  without the project owning any storage infrastructure directly.

## Consequences

- `tokenURI` is always `ipfs://<CID>`, never an `https://` URL directly —
  gateway resolution (`https://<gateway>/ipfs/<CID>`) happens client-side
  only, so the choice of gateway can change without touching on-chain data.
- Pin persistence depends on the Pinata subscription staying active — a
  cost/operational note for the project owner to track, not a design flaw
  of the architecture itself.
