// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MarketplaceNFT} from "../MarketplaceNFT.sol";

/// @title MarketplaceNFTV2
/// @notice Test-only dummy upgrade target. Not deployed to any real network —
/// exists solely so a unit test can exercise the UUPS upgrade path and prove
/// the hardhat-upgrades plugin's storage-layout check passes and existing
/// state (owner, tokens, royalties) survives the upgrade. See
/// docs/milestones/milestone-02-nft-contract.md task 9.
contract MarketplaceNFTV2 is MarketplaceNFT {
    /// @notice New in V2 — proves the upgraded implementation is live.
    function version() external pure returns (string memory) {
        return "v2";
    }
}
