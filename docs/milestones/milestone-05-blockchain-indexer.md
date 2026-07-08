# Milestone 5 — Blockchain Indexer

## Goal

A standalone indexer service that ingests `Transfer`/`Listed`/`Cancelled`/
`Sold` events from Sepolia into PostgreSQL, handles reorgs correctly, and
publishes decoded events to Redis — proven rebuildable from chain history.

## Knowledge Required

- Ethereum event logs, ABI decoding, `getLogs` pagination limits.
- Block confirmations and reorg semantics.
- viem's log-watching/subscription APIs, Redis pub/sub basics.

## Tasks

1. Implement backfill mode: paginated `getLogs` from contract deployment
   block to `latest - CONFIRMATIONS`, per
   [Blockchain Indexer §3](../08-blockchain-indexer.md).
2. Implement live mode: WebSocket subscription for new blocks, with polling
   fallback on disconnect.
3. Implement event decoding + projection-mapping (pure functions, unit
   testable without a DB) per
   [Blockchain Indexer §6](../08-blockchain-indexer.md).
4. Implement `INDEXER_CURSOR` read/update, including block-hash comparison
   for reorg detection and the rewind procedure
   ([Blockchain Indexer §4](../08-blockchain-indexer.md)).
5. Implement idempotent writes keyed by `(txHash, logIndex)`.
6. Implement Redis publish on every applied projection change.
7. Write the "rebuild from chain" runbook script (truncate projection
   tables, reset cursor to deployment block, run backfill) and execute it
   at least once against Sepolia history accumulated so far.
8. Tests: unit tests for decode/mapping logic; integration test against a
   local Hardhat node (deploy contracts, emit real events, assert DB +
   Redis output); a deliberate reorg simulation test (fork/revert a local
   chain mid-indexing, assert correct rewind).

## Acceptance Criteria

- [ ] Running the indexer against Sepolia from a fresh database catches up
      to chain tip and reflects all `Listed`/`Sold`/`Cancelled`/`Transfer`
      events produced during Milestones 2 and 4's manual testing.
- [ ] Killing and restarting the indexer mid-backfill resumes correctly
      with no gaps or duplicate rows (verified by checking row counts
      before/after a forced restart).
- [ ] The reorg simulation test passes: a rewound chain is detected and the
      projection is correctly rewound and re-applied.
- [ ] The "rebuild from chain" runbook, executed against the accumulated
      Sepolia history, produces a projection identical (row-for-row on key
      fields) to the one built incrementally.
- [ ] Redis messages are published for every applied change and are
      observable via a manual subscriber during a live test.

## Definition of Done

- All Acceptance Criteria checked.
- Indexer runs continuously in the local Docker Compose stack without
  manual intervention for at least an extended local test session.
- Runbook documented in `apps/indexer/README.md` (or linked from
  [Database Design §7](../07-database-design.md)) with the exact commands
  used.

## Risks

| Risk | Mitigation |
|---|---|
| RPC provider log-query size limits break backfill on a wide block range | Bounded batch size with configurable range, tested against the actual provider's documented limits |
| Reorg simulation is hard to trigger realistically on public Sepolia | Use a local Hardhat node's `evm_revert`/snapshot features to simulate deterministically rather than relying on a real Sepolia reorg |

## Suggested Commit Plan

1. `feat(indexer): implement backfill mode with paginated getLogs`
2. `feat(indexer): implement live mode via websocket subscription with polling fallback`
3. `feat(indexer): implement event decoding and projection mapping`
4. `feat(indexer): implement indexer_cursor tracking and reorg detection/rewind`
5. `feat(indexer): implement idempotent writes and redis fan-out`
6. `test(indexer): integration test against local hardhat node`
7. `test(indexer): reorg simulation test`
8. `chore(indexer): add rebuild-from-chain runbook script`
