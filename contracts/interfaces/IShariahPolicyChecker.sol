// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IShariahPolicyChecker
 * @notice Interface for Libeara to integrate Gravitas Shariah-compliance middleware.
 * @dev This interface allows Libeara's UltraManager or KYC contracts to verify
 *      compliance before executing financial operations like minting or subscribing.
 */
interface IShariahPolicyChecker {
    /**
     * @notice Verifies if a specific asset is Shariah-compliant.
     * @param asset The address of the tokenized asset (e.g., MG999 Gold Fund).
     * @return compliant True if the asset is whitelisted as Halal.
     */
    function verifyAssetCompliance(address asset) external view returns (bool compliant);

    /**
     * @notice Verifies if a pair of tokens are both Shariah-compliant.
     * @param tokenA First token address.
     * @param tokenB Second token address.
     * @return compliant True if both tokens are whitelisted.
     */
    function areTokensCompliant(address tokenA, address tokenB) external view returns (bool compliant);

    /**
     * @notice Verifies if an executor (e.g., a fund manager or automated bot) is authorized.
     * @param executor The address performing the transaction.
     * @return authorized True if the executor is authorized by Gravitas governance.
     */
    function verifyExecutorStatus(address executor) external view returns (bool authorized);

    /**
     * @notice Single-call compliance gate for Libeara's UltraManager subscription flow.
     * @dev Checks two conditions atomically:
     *      1. subscriptionToken is Shariah-compliant (asset whitelist)
     *      2. msg.sender (the calling contract, e.g. Libeara's UltraManager) is an
     *         authorized institutional executor — NOT the end subscriber.
     *         The subscriber parameter is reserved for future per-investor policy logic.
     * @param subscriber The end-investor address (reserved for future use; not checked in v1).
     * @param subscriptionToken The ERC-20 token address being subscribed to.
     * @return policyVersion The current governance version, for audit trail recording.
     */
    function checkSubscriptionCompliance(address subscriber, address subscriptionToken)
        external
        view
        returns (uint256 policyVersion);

    /**
     * @notice Verifies if a DEX router is authorized for migrations.
     * @param router The address of the DEX router (e.g., Uniswap V2 Router).
     * @return authorized True if the router is whitelisted.
     */
    function isRouterAuthorized(address router) external view returns (bool authorized);
}
