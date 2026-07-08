# Milestone 8 — Auction

## Goal

English auction functionality (create/bid/withdraw/settle) added to the
Marketplace contract, indexed, and usable end-to-end in the frontend.

## Knowledge Required

- English auction mechanics, minimum bid increments.
- Griefing vectors in on-chain auctions (e.g. a bidder whose `receive()`
  always reverts, or a seller who refuses to finalize).

## Tasks

1. Extend `Marketplace.sol` with the Auction module (`createAuction`,
   `bid`, `settle`) sharing the existing pull-payment ledger and fee/
   royalty split logic, per
   [Smart Contract Design §5](../04-smart-contract-design.md).
2. Unit + integration tests: bid must strictly exceed current highest +
   minimum increment; outbid bidder's funds move to `pendingWithdrawals`,
   never force-sent; `settle()` callable by anyone once `endTime` passed;
   settling before `endTime` reverts; settling twice reverts.
3. Deploy the upgraded implementation to the existing Sepolia proxy via the
   Safe + Timelock upgrade flow (first real exercise of the upgrade path
   set up in Milestone 2/4).
4. Indexer: add `AuctionCreated`/`BidPlaced`/`AuctionSettled` event
   handlers and `AUCTION`/`BID` table projections per
   [Blockchain Indexer §6](../08-blockchain-indexer.md).
5. Backend: `AuctionModule` GraphQL types/resolvers (`Auction`, `Bid`,
   `auctions` query, `auctionUpdated` subscription) per
   [GraphQL Schema §2](../13-graphql-schema.md).
6. Frontend: `features/auction` — create-auction form, bid form with live
   countdown, "withdraw outbid funds" action, settle action.

## Acceptance Criteria

- [ ] End-to-end on Sepolia: create an auction, place bids from two
      wallets, confirm the outbid wallet can withdraw its funds, let the
      auction expire, confirm anyone (a third wallet) can call `settle()`
      and the NFT/funds move correctly.
- [ ] A bid below the current highest + minimum increment reverts.
- [ ] `settle()` before `endTime` reverts; after settlement, a second
      `settle()` call reverts.
- [ ] The upgrade deploying this milestone's contract changes is performed
      via the Safe + Timelock flow against the *existing* proxy (not a
      fresh deployment), proving the upgrade path works in practice, not
      just in a unit test.
- [ ] Indexer and frontend reflect auction state changes (new bid, time
      remaining, settlement) without a page refresh.

## Definition of Done

- All Acceptance Criteria checked.
- Test coverage per [Testing Strategy §2](../10-testing-strategy.md) for
  the new contract surface.
- [ADR-0005](../adr/0005-upgradeable-contracts-uups.md)'s upgrade path is
  now proven in practice, not just designed — note the outcome (any
  friction encountered) back into that ADR's Consequences section if
  something notable happened.

## Risks

| Risk | Mitigation |
|---|---|
| Real upgrade-via-Safe-and-Timelock has more operational friction than expected (multisig signing UX, timelock delay waiting) | Budget real wall-clock time for the timelock delay in the schedule; this is expected friction, not a bug |
| Shared storage/logic between fixed-price and auction paths introduces a regression in the already-shipped Milestone 4 flow | Full Milestone 4 regression test suite re-run as part of this milestone's CI, not skipped because "that part didn't change" |

## Suggested Commit Plan

1. `feat(contracts): implement auction module (createAuction/bid/settle)`
2. `test(contracts): cover auction bidding, withdrawal, and settlement rules`
3. `chore(contracts): upgrade sepolia marketplace proxy via safe+timelock`
4. `feat(indexer): add auction event handlers and projections`
5. `feat(backend): implement auction module graphql types and resolvers`
6. `feat(frontend): implement auction creation, bidding, and settlement UI`
