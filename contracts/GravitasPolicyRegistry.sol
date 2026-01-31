// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GravitasPolicyRegistry
 * @notice Centralized registry for Shariah-compliant assets, authorized routers, and protocol executors.
 * @dev This contract serves as the "Risk & Compliance Oracle" mentioned in the Gravitas Protocol thesis,
 *      enforcing institutional governance rules on-chain through Policy-Constrained Routing.
 *      It is designed to be the single source of truth for compliance status across all Gravitas
 *      protocol versions (V2, V3, etc.), enabling Gharar Elimination through deterministic asset validation.
 *
 *      Key Compliance Features:
 *      - Asset Whitelisting: Filters non-compliant assets (e.g., gambling, alcohol-related tokens)
 *      - Router Authorization: Ensures only audited DEX routers are used
 *      - Executor Access Control: Institutional-grade security for migration execution
 *
 *      This registry is a core component of Gravitas's Shariah-aligned infrastructure,
 *      positioning the protocol as a gateway for the $3 Trillion+ Islamic Finance market.
 */
contract GravitasPolicyRegistry is Ownable {
    
    /// @notice Mapping of compliant assets (tokens) where true indicates Shariah-compliance.
    mapping(address => bool) public isAssetCompliant;
    
    /// @notice Mapping of authorized DEX routers that the Teleport engine is permitted to interact with.
    mapping(address => bool) public isRouterAuthorized;
    
    /// @notice Mapping of authorized executors (Keepers/Institutions) permitted to call core migration functions.
    mapping(address => bool) public isExecutor;

    /// @dev Emitted when the compliance status of an asset is updated.
    /// @param asset The address of the token whose compliance status was changed.
    /// @param status The new compliance status (true for compliant, false otherwise).
    event AssetComplianceUpdated(address indexed asset, bool status);
    
    /// @dev Emitted when the authorization status of a router is updated.
    /// @param router The address of the router whose authorization status was changed.
    /// @param status The new authorization status (true for authorized, false otherwise).
    event RouterAuthorizationUpdated(address indexed router, bool status);
    
    /// @dev Emitted when the execution status of an address is updated.
    /// @param executor The address of the executor whose status was changed.
    /// @param status The new executor status (true for authorized, false otherwise).
    event ExecutorStatusUpdated(address indexed executor, bool status);

    /**
     * @notice Initializes the contract, setting the deployer as the initial owner and executor.
     * @dev The deployer is automatically whitelisted as an executor to allow immediate setup of policies.
     */
    constructor() Ownable(msg.sender) {
        isExecutor[msg.sender] = true;
    }

    /**
     * @notice Updates the Shariah compliance status for a specific asset (token).
     * @dev This function is critical for enforcing the "Asset Whitelisting" policy, preventing
     *      the protocol from routing liquidity into non-compliant assets (e.g., those associated
     *      with Riba (interest), Gharar (uncertainty), or Maysir (speculation/gambling)).
     *
     *      Shariah Compliance Enforcement:
     *      - Eliminates Gharar by ensuring deterministic asset validation before routing
     *      - Prevents Riba by excluding interest-bearing or usurious tokens
     *      - Avoids Maysir by filtering gambling and speculative assets
     *
     *      Only the contract owner can call this function to maintain institutional control.
     *
     * @param asset The token address to update.
     * @param status True if the asset is Shariah-compliant, false otherwise.
     */
    function setAssetCompliance(address asset, bool status) external onlyOwner {
        require(asset != address(0), "GPR: Invalid asset address");
        isAssetCompliant[asset] = status;
        emit AssetComplianceUpdated(asset, status);
    }

    /**
     * @notice Updates the authorization status for a DEX router.
     * @dev This enforces the "Router Authorization" policy as part of Policy-Constrained Routing,
     *      ensuring that the Teleport engine only interacts with trusted and audited liquidity venues.
     *
     *      Institutional Security:
     *      - Prevents routing through unaudited or malicious DEX contracts
     *      - Enables deterministic execution by limiting to verified routers
     *      - Supports compliance with institutional risk thresholds
     *
     *      Only the contract owner can call this function to maintain protocol integrity.
     *
     * @param router The router address to update.
     * @param status True if the router is authorized, false otherwise.
     */
    function setRouterAuthorization(address router, bool status) external onlyOwner {
        require(router != address(0), "GPR: Invalid router address");
        isRouterAuthorized[router] = status;
        emit RouterAuthorizationUpdated(router, status);
    }

    /**
     * @notice Updates the status of an authorized protocol executor.
     * @dev Executors are typically institutional partners or keepers responsible for triggering
     *      large-scale migrations. This access control is vital for institutional security.
     * @param executor The executor address to update.
     * @param status True if the address is authorized to execute migrations, false otherwise.
     */
    function setExecutorStatus(address executor, bool status) external onlyOwner {
        require(executor != address(0), "GPR: Invalid executor address");
        isExecutor[executor] = status;
        emit ExecutorStatusUpdated(executor, status);
    }

    /**
     * @notice Checks if a pair of tokens is compliant.
     * @dev This is the primary check used by the Teleport engine before any migration is executed,
     *      implementing Gharar Elimination through deterministic asset validation.
     *
     *      Compliance Validation:
     *      - Both tokenA and tokenB must be whitelisted as Shariah-compliant
     *      - Ensures no non-compliant assets are routed (e.g., gambling, alcohol-related tokens)
     *      - Enables Policy-Constrained Routing by enforcing pre-defined compliance parameters
     *
     *      This function is critical for maintaining the protocol's Shariah governance standards
     *      and providing mathematical certainty for institutional users.
     *
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @return A boolean indicating whether both tokens are compliant.
     */
    function areTokensCompliant(address tokenA, address tokenB) external view returns (bool) {
        return isAssetCompliant[tokenA] && isAssetCompliant[tokenB];
    }
}
