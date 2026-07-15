// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Not referenced anywhere — its only purpose is to force Hardhat to compile
// ERC1967Proxy into apps/contracts/artifacts, so apps/indexer's integration
// tests can deploy real UUPS proxies directly (matching production, unlike
// calling initialize() on a bare implementation, which always reverts with
// InvalidInitialization() since the constructor's _disableInitializers()
// locks that exact contract's own storage).
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
