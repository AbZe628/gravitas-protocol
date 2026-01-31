// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GravitasPolicyRegistry
 * @author Gravitas Protocol Labs
 * @notice The Risk & Compliance Oracle - Centralized registry for Shariah-compliant assets,
 *         authorized routers, and protocol executors.
 * @dev This contract serves as the "Risk & Compliance Oracle" described in the Gravitas Protocol thesis,
 *      enforcing institutional governance rules on-chain through Policy-Constrained Routing.
 *
 *      SHARIAH GOVERNANCE STRUCTURE:
 *      ┌─────────────────────────────────────────────────────────────────────────────────┐
 *      │ 1. NO RIBA (Interest): Revenue via service fees, not interest-based lending    │
 *      │ 2. GHARAR ELIMINATION: Deterministic routing removes ambiguity in execution    │
 *      │ 3. ASSET WHITELISTING: Filter non-compliant assets (gambling, alcohol tokens)  │
 *      │ 4. MAYSIR AVOIDANCE: No speculative or gambling-related assets permitted       │
 *      └─────────────────────────────────────────────────────────────────────────────────┘
 *
 *      COMPLIANCE FLOW (User → SDK → Registry → Contract):
 *      Step 1: Intent Capture - User defines capital movement via Gravitas SDK
 *      Step 2: Deterministic Pathing - Routing engine calculates optimal path
 *      Step 3: Risk & Compliance Check - THIS CONTRACT validates against Shariah parameters
 *      Step 4: Atomic Execution - Smart contracts execute with guaranteed outcomes
 *
 *      This registry is designed for institutional players (banks, fintechs, family offices)
 *      who require mathematical certainty and cannot use tools that "might" work.
 *      Gateway to the $3 Trillion+ Islamic Finance market.
 */
contract GravitasPolicyRegistry is Ownable {
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    //                              STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /// @notice Mapping of Shariah-compliant assets where true indicates compliance.
    /// @dev Asset Whitelisting: Filters non-compliant tokens (gambling, alcohol, interest-bearing).
    mapping(address => bool) public isAssetCompliant;
    
    /// @notice Mapping of authorized DEX routers permitted for Policy-Constrained Routing.
    /// @dev Only audited, trusted liquidity venues are authorized to prevent Gharar.
    mapping(address => bool) public isRouterAuthorized;
    
    /// @notice Mapping of authorized executors (Keepers/Institutions) for migration functions.
    /// @dev Institutional-grade access control for banks, fintechs, and family offices.
    mapping(address => bool) public isExecutor;

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                                   EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════

    /// @dev Emitted when the Shariah compliance status of an asset is updated.
    /// @param asset The address of the token whose compliance status was changed.
    /// @param status The new compliance status (true = Shariah-compliant).
    event AssetComplianceUpdated(address indexed asset, bool status);
    
    /// @dev Emitted when the authorization status of a router is updated.
    /// @param router The address of the router whose authorization was changed.
    /// @param status The new authorization status (true = authorized for routing).
    event RouterAuthorizationUpdated(address indexed router, bool status);
    
    /// @dev Emitted when the execution status of an institutional address is updated.
    /// @param executor The address of the executor whose status was changed.
    /// @param status The new executor status (true = authorized to execute migrations).
    event ExecutorStatusUpdated(address indexed executor, bool status);

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                                 CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the Risk & Compliance Oracle.
     * @dev The deployer is automatically whitelisted as an executor for immediate policy setup.
     *      This follows the institutional mindset: Code safety first, regulatory foresight second.
     */
    constructor() Ownable(msg.sender) {
        isExecutor[msg.sender] = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           COMPLIANCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Updates the Shariah compliance status for a specific asset (token).
     * @dev ASSET WHITELISTING POLICY - Critical for Gharar Elimination.
     *
     *      This function enforces the following Islamic Finance principles:
     *      ┌────────────────────────────────────────────────────────────────────────────┐
     *      │ • RIBA (Interest): Excludes interest-bearing or usurious tokens           │
     *      │ • GHARAR (Uncertainty): Deterministic validation before any routing       │
     *      │ • MAYSIR (Speculation): Filters gambling and speculative assets           │
     *      └────────────────────────────────────────────────────────────────────────────┘
     *
     *      Non-compliant asset examples: Gambling tokens, alcohol-related tokens,
     *      interest-bearing instruments, speculative derivatives.
     *
     * @param asset The token address to update compliance status for.
     * @param status True if the asset is Shariah-compliant, false otherwise.
     */
    function setAssetCompliance(address asset, bool status) external onlyOwner {
        require(asset != address(0), "GPR: Invalid asset address");
        isAssetCompliant[asset] = status;
        emit AssetComplianceUpdated(asset, status);
    }

    /**
     * @notice Updates the authorization status for a DEX router.
     * @dev ROUTER AUTHORIZATION POLICY - Enforces Policy-Constrained Routing.
     *
     *      Institutional Security Features:
     *      ┌────────────────────────────────────────────────────────────────────────────┐
     *      │ • Prevents routing through unaudited or malicious DEX contracts           │
     *      │ • Enables deterministic execution by limiting to verified routers         │
     *      │ • Supports compliance with institutional risk thresholds                  │
     *      │ • Eliminates Gharar by ensuring predictable routing behavior              │
     *      └────────────────────────────────────────────────────────────────────────────┘
     *
     * @param router The router address to update authorization status for.
     * @param status True if the router is authorized for institutional use, false otherwise.
     */
    function setRouterAuthorization(address router, bool status) external onlyOwner {
        require(router != address(0), "GPR: Invalid router address");
        isRouterAuthorized[router] = status;
        emit RouterAuthorizationUpdated(router, status);
    }

    /**
     * @notice Updates the status of an authorized protocol executor.
     * @dev EXECUTOR ACCESS CONTROL - Institutional-grade security for migration execution.
     *
     *      Executors are typically:
     *      • Institutional partners (banks, fintechs, family offices)
     *      • Automated keepers for large-scale migrations
     *      • Authorized protocol operators
     *
     *      This access control is vital for maintaining the protocol's institutional
     *      security posture and compliance with regulatory requirements.
     *
     * @param executor The executor address to update status for.
     * @param status True if authorized to execute migrations, false otherwise.
     */
    function setExecutorStatus(address executor, bool status) external onlyOwner {
        require(executor != address(0), "GPR: Invalid executor address");
        isExecutor[executor] = status;
        emit ExecutorStatusUpdated(executor, status);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           COMPLIANCE VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Verifies if a token pair is Shariah-compliant for routing.
     * @dev PRIMARY COMPLIANCE CHECK - Implements Gharar Elimination through deterministic validation.
     *
     *      This function is called by the Teleport engine before ANY migration is executed,
     *      ensuring the protocol never routes liquidity into non-compliant assets.
     *
     *      Compliance Validation Flow:
     *      ┌────────────────────────────────────────────────────────────────────────────┐
     *      │ 1. Both tokenA AND tokenB must be whitelisted as Shariah-compliant        │
     *      │ 2. If either token fails compliance, the entire migration is blocked      │
     *      │ 3. This provides mathematical certainty for institutional users           │
     *      │ 4. No partial compliance - it's all or nothing (Deterministic Execution)  │
     *      └────────────────────────────────────────────────────────────────────────────┘
     *
     * @param tokenA The address of the first token in the pair.
     * @param tokenB The address of the second token in the pair.
     * @return compliant True if BOTH tokens are Shariah-compliant, false otherwise.
     */
    function areTokensCompliant(address tokenA, address tokenB) external view returns (bool compliant) {
        compliant = isAssetCompliant[tokenA] && isAssetCompliant[tokenB];
    }

    /**
     * @notice Verifies the compliance status of a single asset.
     * @dev Convenience function for SDK and external integrations to check individual assets.
     *      Used during the "Intent Capture" phase of the compliance flow.
     *
     * @param asset The token address to verify.
     * @return compliant True if the asset is Shariah-compliant.
     */
    function verifyAssetCompliance(address asset) external view returns (bool compliant) {
        compliant = isAssetCompliant[asset];
    }

    /**
     * @notice Verifies if a router is authorized for Policy-Constrained Routing.
     * @dev Used by the SDK during the "Deterministic Pathing" phase to ensure
     *      only authorized liquidity venues are considered for routing.
     *
     * @param router The router address to verify.
     * @return authorized True if the router is authorized for institutional use.
     */
    function verifyRouterAuthorization(address router) external view returns (bool authorized) {
        authorized = isRouterAuthorized[router];
    }

    /**
     * @notice Verifies if an address is an authorized executor.
     * @dev Used during the "Atomic Execution" phase to validate caller permissions.
     *
     * @param executor The address to verify.
     * @return authorized True if the address is authorized to execute migrations.
     */
    function verifyExecutorStatus(address executor) external view returns (bool authorized) {
        authorized = isExecutor[executor];
    }
}
