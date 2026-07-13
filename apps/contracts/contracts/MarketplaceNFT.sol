// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title MarketplaceNFT
/// @notice UUPS-upgradeable ERC-721 collection with EIP-2981 royalties for
/// the Web3 NFT Marketplace. See docs/04-smart-contract-design.md §3.
contract MarketplaceNFT is
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ERC2981Upgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    uint256 private _nextTokenId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the collection and sets the deployer as the
    /// initial owner (ownership is transferred to a Gnosis Safe post-deploy
    /// — see docs/adr/0005-upgradeable-contracts-uups.md).
    /// @param name_ ERC-721 collection name.
    /// @param symbol_ ERC-721 collection symbol.
    function initialize(string calldata name_, string calldata symbol_) public initializer {
        __ERC721_init(name_, symbol_);
        __ERC721URIStorage_init();
        __ERC2981_init();
        __Ownable_init(msg.sender);
        __Pausable_init();
    }

    /// @notice Mints a new token to `to`, setting its metadata URI and
    /// per-token EIP-2981 royalty. Open minting — anyone can mint to
    /// themselves (no allowlist in Phase 1).
    /// @param to Recipient of the newly minted token.
    /// @param uri Token metadata URI, expected to be `ipfs://<CID>` (see
    /// docs/adr/0010-nft-metadata-storage-ipfs.md).
    /// @param royaltyReceiver Address to receive EIP-2981 royalties for this token.
    /// @param royaltyBps Royalty in basis points (1 bps = 0.01%), capped at 10000 by ERC2981Upgradeable itself.
    /// @return tokenId The newly minted token's id.
    function mint(
        address to,
        string calldata uri,
        address royaltyReceiver,
        uint96 royaltyBps
    ) external whenNotPaused returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokenRoyalty(tokenId, royaltyReceiver, royaltyBps);
    }

    /// @notice Emergency stop: blocks minting and transfers. Owner-only.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resumes minting and transfers. Owner-only.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Restricts upgrades to the owner (a Gnosis Safe behind a
    /// TimelockController — see docs/09-security-model.md §3).
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @dev Central hook for mint/transfer/burn in OZ v5 — gating it on
    /// `whenNotPaused` blocks all three when paused, matching the
    /// "Pausable emergency stop on mint/transfer" requirement.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Upgradeable) whenNotPaused returns (address) {
        return super._update(to, tokenId, auth);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable, ERC2981Upgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @dev Reserved storage slots for future upgrades — see
    /// docs/04-smart-contract-design.md §2 (storage layout rules).
    uint256[50] private __gap;
}
