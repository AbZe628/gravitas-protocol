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
     * @returns compliant True if the asset is whitelisted as Halal.
     */
    function verifyAssetCompliance(address asset) external view returns (bool compliant);

    /**
     * @notice Verifies if a pair of tokens are both Shariah-compliant.
     * @param tokenA First token address.
     * @param tokenB Second token address.
     * @returns compliant True if both tokens are whitelisted.
     */
    function areTokensCompliant(address tokenA, address tokenB) external view returns (bool compliant);

    /**
     * @notice Verifies if an executor (e.g., a fund manager or automated bot) is authorized.
     * @param executor The address performing the transaction.
     * @returns authorized True if the executor is authorized by Gravitas governance.
     */
    function verifyExecutorStatus(address executor) external view returns (bool authorized);

    /**
     * @notice Comprehensive check for Libeara subscription flows.
     * @dev This is the primary hook for Libeara's UltraManager. It ensures both the
     *      subscriber's intent and the asset itself meet Shariah standards.
     *      Integration: Call this in `_beforeMint` or `subscribe` functions.
     * @param subscriber The address of the investor.
     * @param subscriptionToken The address of the asset being subscribed to.
     * @returns status A status code (e.g., 1 for success) or reverts on failure.
     */
    function checkSubscriptionCompliance(address subscriber, address subscriptionToken)
        external
        view
        returns (uint256 status);
}
