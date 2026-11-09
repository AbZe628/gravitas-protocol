// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.24;

/*
 * REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * This manager does not implement investor eligibility or request-id replay protection.
 */
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {GravitasPolicyRegistry} from "contracts/GravitasPolicyRegistry.sol";

contract DemoSukukManager {
    using SafeERC20 for IERC20;

    GravitasPolicyRegistry public immutable registry;

    event TransferChecked(
        bytes32 indexed requestId,
        address indexed token,
        address from,
        address to,
        uint256 amount,
        uint256 policyVersion,
        bytes32 policyHash
    );

    constructor(address registryAddress) {
        registry = GravitasPolicyRegistry(registryAddress);
    }

    function transferSukuk(
        bytes32 requestId,
        address token,
        address from,
        address to,
        uint256 amount
    ) external {
        uint256 version = registry.checkSubscriptionCompliance(to, token);
        IERC20(token).safeTransferFrom(from, to, amount);
        emit TransferChecked(requestId, token, from, to, amount, version, registry.policyHistory(version));
    }
}
