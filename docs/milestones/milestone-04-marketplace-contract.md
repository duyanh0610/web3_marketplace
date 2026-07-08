# Milestone 4 — Marketplace Contract (Fixed-Price)

## Goal

A UUPS-upgradeable `Marketplace` contract supporting list/buy/cancel of
fixed-price NFT listings, with correct fee + royalty splitting via
pull-payments, deployed to Sepolia.

## Knowledge Required

- Reentrancy attacks and the checks-effects-interactions pattern.
- Pull-payment design (why push-payments to arbitrary addresses are unsafe).
- EIP-2981 `royaltyInfo()` consumption from another contract.

## Tasks

1. Implement `Marketplace.sol`: `OwnableUpgradeable`, `PausableUpgradeable`,
   `ReentrancyGuardUpgradeable`, `UUPSUpgradeable` (see
   [Smart Contract Design §4](../04-smart-contract-design.md)).
2. Implement `list`, `cancel`, `buy`, `withdraw` per the checks-effects-
   interactions ordering specified in the design doc.
3. Implement owner-configurable protocol fee (`feeBps`, capped at a hardcoded
   max) and fee recipient.
4. Implement `pendingWithdrawals` ledger and `withdraw()`.
5. Deploy proxy to Sepolia, transfer ownership to the Gnosis Safe, verify on
   Etherscan, publish ABI/address to `packages/contracts-abi`.
6. Unit + integration tests (Hardhat): full list → buy flow; cancel by
   non-seller reverts; buy with wrong `msg.value` reverts; buy after
   seller revokes NFT approval reverts; royalty + fee split sums exactly to
   the sale price for a range of hand-picked price/fee/royalty
   combinations (full fuzz coverage deferred to
   [Milestone 9](./milestone-09-security-hardening.md), but a handful of
   edge-case unit tests belong here already — e.g. zero royalty, max fee).
7. Reentrancy test: a malicious `ERC721Receiver`/fallback contract attempts
   to re-enter `buy()`/`withdraw()`, confirmed reverted.

## Acceptance Criteria

- [ ] End-to-end on Sepolia: list an NFT, buy it from a second wallet, and
      confirm the NFT transferred and both the seller's and a nonzero
      royalty recipient's `pendingWithdrawals` are correct, verified via
      Etherscan reads.
- [ ] Cancelling a listing from the wrong account reverts.
- [ ] A reentrancy attempt against `buy()` or `withdraw()` reverts (proven
      by an actual malicious-contract test, not just code review).
- [ ] Sum of `(sellerAmount + royaltyAmount + feeAmount)` equals the sale
      price exactly for every tested price/fee/royalty combination — no
      rounding-induced fund loss or excess.

## Definition of Done

- All Acceptance Criteria checked.
- Unit test coverage target from
  [Testing Strategy §2](../10-testing-strategy.md) met.
- Slither run locally shows no unaddressed high/medium findings (full CI
  gate wiring happens in Milestone 9, but the contract shouldn't ship a
  known finding forward).

## Risks

| Risk | Mitigation |
|---|---|
| Integer division rounding leaves dust wei unaccounted for | Explicit test asserting the three splits sum to the exact price; if dust exists, document where it's swept (e.g. rounds to fee recipient) rather than leaving it silently stuck |
| A stale listing (seller transferred the NFT elsewhere without cancelling) is bought | `buy()` re-validates current ownership/approval at execution time (see design doc) — tested explicitly here |

## Suggested Commit Plan

1. `feat(contracts): implement Marketplace list/cancel with pull-payment ledger`
2. `feat(contracts): implement buy() with fee + royalty split`
3. `feat(contracts): implement withdraw() and owner fee configuration`
4. `test(contracts): cover list/buy/cancel golden paths and revert cases`
5. `test(contracts): reentrancy attack test against buy() and withdraw()`
6. `test(contracts): fee/royalty split sums exactly across price combinations`
7. `chore(contracts): deploy marketplace proxy to sepolia, transfer to safe, verify`
