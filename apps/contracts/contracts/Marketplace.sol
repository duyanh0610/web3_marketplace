// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title Marketplace
/// @notice UUPS-upgradeable fixed-price NFT marketplace with pull-payment
/// fee/royalty splitting. See docs/04-smart-contract-design.md §4.
contract Marketplace is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardTransient, UUPSUpgradeable {
    enum ListingStatus {
        ACTIVE,
        CANCELLED,
        SOLD
    }

    struct Listing {
        address nft;
        uint256 tokenId;
        address seller;
        uint256 price;
        ListingStatus status;
    }

    /// @dev Protocol fee cap (5%) — see docs/14-coding-guidelines.md.
    uint96 public constant MAX_FEE_BPS = 500;

    mapping(uint256 listingId => Listing) private _listings;
    uint256 private _nextListingId;
    mapping(address account => uint256 amount) public pendingWithdrawals;
    uint96 public feeBps;
    address public feeRecipient;

    event Listed(
        uint256 indexed listingId,
        address indexed nft,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );
    event Cancelled(uint256 indexed listingId);
    // feeAmount/royaltyAmount/royaltyReceiver are emitted directly (rather
    // than left for an off-chain indexer to recompute from the current
    // feeBps) so the event log is a complete, self-contained record — see
    // docs/08-blockchain-indexer.md §6 and apps/indexer's Sold handler.
    event Sold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price,
        uint256 feeAmount,
        uint256 royaltyAmount,
        address royaltyReceiver
    );
    event Withdrawn(address indexed account, uint256 amount);
    event FeeUpdated(uint96 feeBps);
    event FeeRecipientUpdated(address indexed feeRecipient);

    error PriceMustBePositive();
    error NotTokenOwner();
    error MarketplaceNotApproved();
    error ListingNotActive();
    error NotSeller();
    error IncorrectPayment();
    error SellerNoLongerOwnsToken();
    error MarketplaceNoLongerApproved();
    error NothingToWithdraw();
    error WithdrawalTransferFailed();
    error FeeExceedsMax();
    error ZeroAddress();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the marketplace with the deployer as owner (later
    /// transferred to a Gnosis Safe — see docs/adr/0005-upgradeable-contracts-uups.md)
    /// and the initial protocol fee configuration.
    /// @param feeRecipient_ Address credited with protocol fees on each sale.
    /// @param feeBps_ Protocol fee in basis points, capped at MAX_FEE_BPS.
    function initialize(address feeRecipient_, uint96 feeBps_) public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        _setFeeRecipient(feeRecipient_);
        _setFeeBps(feeBps_);
    }

    /// @notice Lists an owned, marketplace-approved NFT for a fixed price.
    /// Escrow-free: the NFT stays in the seller's wallet until buy() executes.
    /// @param nft ERC-721 contract address of the token being listed.
    /// @param tokenId Token id being listed.
    /// @param price Sale price in wei.
    /// @return listingId The newly created listing's id.
    function list(address nft, uint256 tokenId, uint256 price) external whenNotPaused returns (uint256 listingId) {
        if (price == 0) revert PriceMustBePositive();
        if (IERC721(nft).ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (!_isApprovedForMarketplace(nft, msg.sender, tokenId)) revert MarketplaceNotApproved();

        listingId = _nextListingId++;
        _listings[listingId] = Listing({
            nft: nft,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            status: ListingStatus.ACTIVE
        });

        emit Listed(listingId, nft, tokenId, msg.sender, price);
    }

    /// @notice Cancels an active listing. Lister-only.
    /// @param listingId Listing to cancel.
    function cancel(uint256 listingId) external {
        Listing storage listing = _listings[listingId];
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        listing.status = ListingStatus.CANCELLED;

        emit Cancelled(listingId);
    }

    /// @notice Buys an active listing at its listed price. Re-validates the
    /// seller still owns and has approved the token (a stale listing whose
    /// NFT moved elsewhere cannot be bought). Credits seller/royalty/fee
    /// amounts to pendingWithdrawals rather than pushing ETH directly.
    /// @param listingId Listing to buy.
    function buy(uint256 listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = _listings[listingId];

        // Checks
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive();
        if (msg.value != listing.price) revert IncorrectPayment();

        address nft = listing.nft;
        uint256 tokenId = listing.tokenId;
        address seller = listing.seller;
        uint256 price = listing.price;

        if (IERC721(nft).ownerOf(tokenId) != seller) revert SellerNoLongerOwnsToken();
        if (!_isApprovedForMarketplace(nft, seller, tokenId)) revert MarketplaceNoLongerApproved();

        // Effects
        listing.status = ListingStatus.SOLD;

        // Interactions
        IERC721(nft).safeTransferFrom(seller, msg.sender, tokenId);

        (uint256 feeAmount, uint256 royaltyAmount, address royaltyReceiver) = _computeFeeAndRoyalty(nft, tokenId, price);
        // Seller receives whatever remains after fee + royalty — any
        // integer-division rounding dust from those two cuts lands here by
        // construction, so the three splits always sum exactly to `price`.
        uint256 sellerAmount = price - feeAmount - royaltyAmount;

        // Ledger updates after the external safeTransferFrom call — flagged
        // by Slither, but not exploitable: `nonReentrant` blocks any
        // re-entrant call outright (see test/Marketplace.reentrancy.spec.ts),
        // and the only state a reentrant call could observe is
        // `listing.status`, already set to SOLD above, before this line.
        // slither-disable-next-line reentrancy-benign
        pendingWithdrawals[seller] += sellerAmount;
        if (royaltyAmount > 0) {
            pendingWithdrawals[royaltyReceiver] += royaltyAmount;
        }
        if (feeAmount > 0) {
            pendingWithdrawals[feeRecipient] += feeAmount;
        }

        emit Sold(listingId, msg.sender, price, feeAmount, royaltyAmount, royaltyReceiver);
    }

    /// @notice Claims the caller's accumulated pending balance (from sales,
    /// royalties, or protocol fees). Pull-payment: zeroes the balance before
    /// sending to block reentrant double-withdrawal.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert WithdrawalTransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Returns the full listing record for `listingId`.
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    /// @notice Updates the protocol fee. Owner-only, capped at MAX_FEE_BPS.
    function setFeeBps(uint96 newFeeBps) external onlyOwner {
        _setFeeBps(newFeeBps);
    }

    /// @notice Updates the protocol fee recipient. Owner-only.
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        _setFeeRecipient(newFeeRecipient);
    }

    /// @notice Emergency stop: blocks list()/buy(). Owner-only.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resumes list()/buy(). Owner-only.
    function unpause() external onlyOwner {
        _unpause();
    }

    function _setFeeBps(uint96 newFeeBps) private {
        if (newFeeBps > MAX_FEE_BPS) revert FeeExceedsMax();
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    function _setFeeRecipient(address newFeeRecipient) private {
        if (newFeeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(newFeeRecipient);
    }

    function _isApprovedForMarketplace(address nft, address owner, uint256 tokenId) private view returns (bool) {
        return
            IERC721(nft).isApprovedForAll(owner, address(this)) || IERC721(nft).getApproved(tokenId) == address(this);
    }

    /// @dev Splits `price` into the protocol fee and, if `nft` implements
    /// EIP-2981, the creator royalty — capped so the two never exceed
    /// `price` even if a misconfigured/malicious royaltyInfo() overclaims.
    function _computeFeeAndRoyalty(
        address nft,
        uint256 tokenId,
        uint256 price
    ) private view returns (uint256 feeAmount, uint256 royaltyAmount, address royaltyReceiver) {
        feeAmount = (price * feeBps) / 10_000;

        if (IERC721(nft).supportsInterface(type(IERC2981).interfaceId)) {
            (royaltyReceiver, royaltyAmount) = IERC2981(nft).royaltyInfo(tokenId, price);
            uint256 maxRoyalty = price - feeAmount;
            if (royaltyAmount > maxRoyalty) {
                royaltyAmount = maxRoyalty;
            }
        }
    }

    /// @dev Restricts upgrades to the owner (a Gnosis Safe — see
    /// docs/09-security-model.md §3).
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @dev Reserved storage slots for future upgrades — see
    /// docs/04-smart-contract-design.md §2.
    uint256[50] private __gap;
}
