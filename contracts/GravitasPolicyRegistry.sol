// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GravitasPolicyRegistry
 * @notice Centralized registry for Shariah-compliant assets and authorized routers.
 * @dev This contract serves as the "Risk & Compliance Oracle" mentioned in the Gravitas vision.
 */
contract GravitasPolicyRegistry is Ownable {
    
    // Mapping of compliant assets (tokens)
    mapping(address => bool) public isAssetCompliant;
    
    // Mapping of authorized routers
    mapping(address => bool) public isRouterAuthorized;
    
    // Mapping of authorized executors (Keepers/Institutions)
    mapping(address => bool) public isExecutor;

    event AssetComplianceUpdated(address indexed asset, bool status);
    event RouterAuthorizationUpdated(address indexed router, bool status);
    event ExecutorStatusUpdated(address indexed executor, bool status);

    constructor() Ownable(msg.sender) {
        isExecutor[msg.sender] = true;
    }

    /**
     * @notice Update compliance status for an asset.
     * @param asset The token address.
     * @param status True if Shariah-compliant, false otherwise.
     */
    function setAssetCompliance(address asset, bool status) external onlyOwner {
        require(asset != address(0), "Invalid asset address");
        isAssetCompliant[asset] = status;
        emit AssetComplianceUpdated(asset, status);
    }

    /**
     * @notice Update authorization status for a router.
     * @param router The router address.
     * @param status True if authorized, false otherwise.
     */
    function setRouterAuthorization(address router, bool status) external onlyOwner {
        require(router != address(0), "Invalid router address");
        isRouterAuthorized[router] = status;
        emit RouterAuthorizationUpdated(router, status);
    }

    /**
     * @notice Update executor status.
     * @param executor The executor address.
     * @param status True if authorized, false otherwise.
     */
    function setExecutorStatus(address executor, bool status) external onlyOwner {
        require(executor != address(0), "Invalid executor address");
        isExecutor[executor] = status;
        emit ExecutorStatusUpdated(executor, status);
    }

    /**
     * @notice Check if a pair of tokens is compliant.
     */
    function areTokensCompliant(address tokenA, address tokenB) external view returns (bool) {
        return isAssetCompliant[tokenA] && isAssetCompliant[tokenB];
    }
}
