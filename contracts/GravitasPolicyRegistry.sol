// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title GravitasPolicyRegistry
 * @notice The Risk & Compliance Oracle - Centralized registry for Shariah-compliant assets,
 *         authorized routers, and protocol executors.
 * @dev Governance: Transfer ownership to a GravitasTimelock (TimelockController) 
 *      backed by a Gnosis Safe multisig before mainnet deployment.
 *      Recommended production config:
 *      - Owner: GravitasTimelock contract address
 *      - Timelock proposers: Gnosis Safe multisig (3-of-5 recommended for GCC institutional use)
 *      - Timelock delay: 48 hours minimum
 */
contract GravitasPolicyRegistry is Ownable2Step {
    // ═══════════════════════════════════════════════════════════════════════════════════
    //                              STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════

    mapping(address => bool) public isAssetCompliant;
    mapping(address => bool) public isRouterAuthorized;
    mapping(address => bool) public isExecutor;

    // Policy Versioning
    uint256 public currentVersion;
    mapping(uint256 => bytes32) public policyHistory;

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                                   EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════

    event AssetComplianceUpdated(address indexed asset, bool status);
    event RouterAuthorizationUpdated(address indexed router, bool status);
    event ExecutorStatusUpdated(address indexed executor, bool status);
    event PolicyUpdated(uint256 indexed version, bytes32 policyHash);

    constructor() Ownable(msg.sender) {
        isExecutor[msg.sender] = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           COMPLIANCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════════

    function setAssetCompliance(address asset, bool status) external onlyOwner {
        require(asset != address(0), "GPR: Invalid asset address");
        isAssetCompliant[asset] = status;
        _updateVersion();
        emit AssetComplianceUpdated(asset, status);
    }

    function setRouterAuthorization(address router, bool status) external onlyOwner {
        require(router != address(0), "GPR: Invalid router address");
        isRouterAuthorized[router] = status;
        _updateVersion();
        emit RouterAuthorizationUpdated(router, status);
    }

    function setExecutorStatus(address executor, bool status) external onlyOwner {
        require(executor != address(0), "GPR: Invalid executor address");
        isExecutor[executor] = status;
        _updateVersion();
        emit ExecutorStatusUpdated(executor, status);
    }

    function _updateVersion() internal {
        currentVersion++;
        bytes32 policyHash = keccak256(abi.encode(block.timestamp, msg.sender, currentVersion));
        policyHistory[currentVersion] = policyHash;
        emit PolicyUpdated(currentVersion, policyHash);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           COMPLIANCE VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════════════

    function areTokensCompliant(address tokenA, address tokenB) external view returns (bool compliant) {
        compliant = isAssetCompliant[tokenA] && isAssetCompliant[tokenB];
    }

    function verifyAssetCompliance(address asset) external view returns (bool compliant) {
        compliant = isAssetCompliant[asset];
    }

    function verifyRouterAuthorization(address router) external view returns (bool authorized) {
        authorized = isRouterAuthorized[router];
    }

    function verifyExecutorStatus(address executor) external view returns (bool authorized) {
        authorized = isExecutor[executor];
    }
}
