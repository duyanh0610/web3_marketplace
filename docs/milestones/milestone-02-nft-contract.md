# Milestone 2 — NFT Contract

## Goal

A UUPS-upgradeable ERC-721 contract (`MarketplaceNFT`) with EIP-2981
royalties, deployed to Sepolia behind a proxy owned by a Gnosis Safe, with
minting working end-to-end from a script/test.

## Knowledge Required

- ERC-721 standard, OpenZeppelin `ERC721Upgradeable`/`ERC721URIStorageUpgradeable`.
- EIP-2981 royalty standard (`ERC2981Upgradeable`).
- UUPS proxy mechanics, `@openzeppelin/hardhat-upgrades` plugin usage.
- Gnosis Safe deployment on a testnet.

## Tasks

1. Implement `MarketplaceNFT.sol`: inherits `ERC721Upgradeable`,
   `ERC721URIStorageUpgradeable`, `ERC2981Upgradeable`, `OwnableUpgradeable`,
   `PausableUpgradeable`, `UUPSUpgradeable` (see
   [Smart Contract Design §3](../04-smart-contract-design.md)).
2. Implement `initialize(string name, string symbol)`, `_disableInitializers()`
   in constructor, storage gap.
3. Implement `mint(address to, string tokenURI, address royaltyReceiver, uint96 royaltyBps)`.
4. Implement `pause()`/`unpause()` (owner-only).
5. Implement `_authorizeUpgrade` restricted to owner.
6. Deploy a Gnosis Safe on Sepolia (2-of-N per
   [Security Model §3](../09-security-model.md)) if not already done.
7. Hardhat deployment script: deploy proxy via `hardhat-upgrades`,
   transfer ownership to the Safe, verify on Sepolia Etherscan.
8. Write deployed proxy address + ABI to `packages/contracts-abi`.
9. Unit tests: mint, tokenURI correctness, royaltyInfo() correctness,
   pause blocks transfers, non-owner cannot pause/upgrade, storage-layout
   validation passes for a dummy V2 upgrade in a test.

## Acceptance Criteria

- [ ] Contract deployed to Sepolia behind a UUPS proxy, verified on
      Etherscan, owned by the Gnosis Safe (not a deployer EOA).
- [ ] Minting from a script produces a token whose `tokenURI` and
      `royaltyInfo()` are correct on-chain (checked via Etherscan "Read
      Contract" or a script, not just a local test).
- [ ] A test upgrade (deploy a trivial V2 implementation that adds one
      function) succeeds via the Safe and preserves existing token state.
- [ ] `hardhat-upgrades`' storage-layout check passes in CI for this
      contract.
- [ ] Non-owner accounts cannot call `pause()`, `unpause()`, or trigger an
      upgrade (reverts as expected).

## Definition of Done

- All Acceptance Criteria checked.
- Unit test coverage ≥ target set in
  [Testing Strategy §2](../10-testing-strategy.md) for this contract.
- NatSpec present on every external/public function.
- `packages/contracts-abi` contains the current ABI + Sepolia address,
  consumable by `apps/indexer` and `apps/frontend`.

## Risks

| Risk | Mitigation |
|---|---|
| Gnosis Safe setup friction (first time using it) | Budget extra time; Safe has a well-documented Sepolia-compatible web UI |
| Storage layout mistake only caught after a real upgrade attempt | `hardhat-upgrades` validates layout *before* deploying the upgrade, catching this in CI/local dev, not on-chain |

## Suggested Commit Plan

1. `feat(contracts): implement MarketplaceNFT with ERC721+ERC2981+UUPS`
2. `test(contracts): unit tests for mint, royalty, pause, access control`
3. `chore(contracts): deployment script for sepolia via hardhat-upgrades`
4. `chore(contracts): transfer proxy ownership to gnosis safe`
5. `chore(contracts): verify on sepolia etherscan, publish abi to packages/contracts-abi`
6. `test(contracts): validate storage layout across a dummy v2 upgrade`
