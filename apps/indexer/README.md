# @we3/indexer

Standalone service that ingests `Transfer`/`Listed`/`Cancelled`/`Sold` events
from Sepolia into PostgreSQL and publishes decoded changes to Redis. See
[docs/08-blockchain-indexer.md](../../docs/08-blockchain-indexer.md) for the
full design and [docs/07-database-design.md §7](../../docs/07-database-design.md)
for why this projection is rebuildable from chain history by design.

## Running

```bash
pnpm --filter @we3/indexer dev     # backfill + live mode, runs until killed
pnpm --filter @we3/indexer build && pnpm --filter @we3/indexer start
```

Required env vars: see `.env.example`.

## Rebuild-from-chain runbook

Because every projection table (`collections`, `tokens`, `listings`,
`sales`, `transfers`, plus the indexer's own `indexer_cursors` /
`indexer_block_hashes`) is derived purely from on-chain events, the whole
projection can be safely wiped and rebuilt at any time — this is a load-bearing
property of the design (docs/07-database-design.md §7), not just a recovery
trick. `Account`/`SiweSession` are untouched: they're genuinely off-chain
(SIWE sessions), not part of this projection.

To rebuild:

```bash
pnpm --filter @we3/indexer rebuild-from-chain
```

This truncates the projection tables (in child-to-parent FK order, inside one
transaction) and the cursor/block-hash tables, then runs a full backfill from
`INDEXER_START_BLOCK` to chain tip. It's the same `backfill()` used by normal
operation — nothing rebuild-specific about the ingestion path, only about
what's wiped beforehand.

**Verified against the real accumulated Sepolia history** (Milestones 2–5's
manual testing): before/after row-for-row comparison on every table's key
fields (`Collection.contractAddress`/`name`/`symbol`; each `Token`'s
`tokenId`/`ownerAddress`/`royaltyBps`; each `Listing`'s
`onchainListingId`/`status`/`sellerAddress`/`priceWei`; the `Sale`'s
`buyerAddress`/`priceWei`/`feePaidWei`/`royaltyPaidWei`; each `Transfer`'s
`fromAddress`/`toAddress`/`txHash`/`logIndex`) came back identical after
running the command above against the same database. Rebuilding is safe to
run any time the projection is suspected to have drifted from chain state.
