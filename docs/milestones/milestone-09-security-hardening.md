# Milestone 9 — Security Hardening

## Goal

Full security checklist applied to the complete contract surface
(NFT + Marketplace + Auction): Slither clean in CI, Foundry fuzz/invariant
suite in place and passing, multisig + timelock fully wired for all
privileged operations.

## Knowledge Required

- Slither static analysis output interpretation.
- Foundry test syntax (`forge test --fuzz`, invariant test harness setup).
- Common Solidity vulnerability classes (see
  [Security Model §1–2](../09-security-model.md)).

## Tasks

1. Introduce Foundry into `apps/contracts` (`foundry.toml`,
   `test/*.t.sol`) per [ADR-0004](../adr/0004-testing-tool-hybrid-hardhat-foundry.md).
2. Write fuzz tests for `Marketplace`/`Auction`: fee/royalty split
   correctness across randomized valid price/fee/royalty inputs.
3. Write the two flagship invariant tests from
   [Security Model §2](../09-security-model.md): (a) sum of
   `pendingWithdrawals` + reserved-for-active-listings ETH never exceeds
   actual contract balance; (b) a `Listing` can never be `SOLD` while its
   token's current owner differs from the recorded seller.
4. Wire Slither into CI (`.github/workflows/ci.yml`), gated on any
   `apps/contracts` change; triage and resolve/justify all findings.
5. Full self-review pass against the
   [Security Model §2 checklist](../09-security-model.md) for every
   contract; document any accepted risk explicitly rather than silently.
6. Confirm Gnosis Safe + `TimelockController` gate every privileged
   operation across both contracts (pause, fee config, upgrade) — not just
   upgrade, which was proven in Milestone 8.
7. Load-test the indexer/backend lightly against a burst of simulated
   marketplace activity (a script placing many listings/bids on a local
   fork) to catch any obvious performance cliff before production.

## Acceptance Criteria

- [ ] `forge test` (fuzz + invariant suite) passes with a meaningful run
      count (documented, e.g. 10,000+ fuzz runs per property).
- [ ] Slither reports zero unaddressed high/medium findings across
      `apps/contracts`.
- [ ] Every privileged function on every contract is confirmed callable
      only through the Safe + Timelock path (tested, not just configured).
- [ ] The Security Model checklist
      ([§2](../09-security-model.md)) is fully checked off, with any
      deliberately-accepted risk documented inline in that doc rather than
      silently skipped.
- [ ] A local burst-load test (e.g. 100 simulated listings/bids in a short
      window) does not reveal an indexer backlog that fails to catch up.

## Definition of Done

- All Acceptance Criteria checked.
- CI's Slither + Foundry jobs are required (not just present) checks on
  the `main` branch protection rule.
- [Security Model](../09-security-model.md) updated with any findings or
  accepted risks discovered during this milestone.

## Risks

| Risk | Mitigation |
|---|---|
| Fuzz/invariant testing surfaces a real bug requiring a contract change after Milestone 8's Sepolia deployment | Budget time for a further upgrade cycle; this is exactly why upgradeability exists — treat a caught bug here as the design working as intended, not a schedule failure |
| Foundry learning curve (new syntax) slows this milestone down more than estimated | Scope is intentionally narrow (two contracts, two invariants) per [ADR-0004](../adr/0004-testing-tool-hybrid-hardhat-foundry.md) — resist the urge to fuzz-test everything just because the tool is now set up |

## Suggested Commit Plan

1. `chore(contracts): introduce foundry alongside hardhat`
2. `test(contracts): fuzz tests for fee/royalty split correctness`
3. `test(contracts): invariant tests for solvency and listing/ownership consistency`
4. `ci: wire slither and foundry into required CI checks`
5. `fix(contracts): address any findings from slither/fuzz/invariant runs`
6. `docs: update security model with hardening milestone findings`
