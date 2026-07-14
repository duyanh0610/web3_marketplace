// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Marketplace} from "../Marketplace.sol";

/// @title ReentrantAttacker
/// @notice Test-only malicious contract used to prove Marketplace's buy()
/// and withdraw() are reentrancy-safe. Not deployed to any real network —
/// see docs/milestones/milestone-04-marketplace-contract.md task 7.
contract ReentrantAttacker is IERC721Receiver {
    Marketplace public immutable MARKETPLACE;

    bool private _reenterOnReceiveNft;
    uint256 private _targetListingId;
    bool private _reenterOnWithdraw;

    constructor(address marketplace_) {
        MARKETPLACE = Marketplace(marketplace_);
    }

    /// @notice Lists a token already owned by this contract — used to set up
    /// the withdraw() reentrancy scenario with this contract as the seller.
    function approveAndList(address nft, uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        IERC721(nft).approve(address(MARKETPLACE), tokenId);
        return MARKETPLACE.list(nft, tokenId, price);
    }

    /// @notice Buys `listingId`, then attempts to re-enter buy() on the same
    /// listing from within the onERC721Received callback triggered by the
    /// NFT transfer inside Marketplace.buy().
    function buyAndReenter(uint256 listingId) external payable {
        _reenterOnReceiveNft = true;
        _targetListingId = listingId;
        MARKETPLACE.buy{value: msg.value}(listingId);
    }

    /// @notice Withdraws this contract's pending balance, then attempts to
    /// re-enter withdraw() from within the receive() callback triggered by
    /// the ETH transfer inside Marketplace.withdraw().
    function withdrawAndReenter() external {
        _reenterOnWithdraw = true;
        MARKETPLACE.withdraw();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
        if (_reenterOnReceiveNft) {
            _reenterOnReceiveNft = false;
            MARKETPLACE.buy(_targetListingId);
        }
        return this.onERC721Received.selector;
    }

    receive() external payable {
        if (_reenterOnWithdraw) {
            _reenterOnWithdraw = false;
            MARKETPLACE.withdraw();
        }
    }
}
