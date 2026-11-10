// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.24;

/*
 * REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * This manager does not implement investor identity, KYC/AML, or eligibility checks.
 */
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {GravitasPolicyRegistry} from "contracts/GravitasPolicyRegistry.sol";

interface IGatedDemoSukukBinding {
    function registry() external view returns (address);
    function manager() external view returns (address);
}

contract DemoSukukManager is Ownable {
    using SafeERC20 for IERC20;

    error InvalidRegistry();
    error InvalidToken();
    error TokenAlreadyConfigured();
    error TokenNotConfigured();
    error InvalidRequestId();
    error RequestAlreadyProcessed(bytes32 requestId);
    error InvalidRecipient();
    error CallerNotTokenOwner(address caller, address from);

    GravitasPolicyRegistry public immutable registry;
    address public gatedToken;
    mapping(bytes32 => bool) public processedRequestIds;

    event GatedTokenConfigured(address indexed token);
    event TransferChecked(
        bytes32 indexed requestId,
        address indexed token,
        address from,
        address to,
        uint256 amount,
        uint256 policyVersion,
        bytes32 policyHash
    );

    constructor(address registryAddress) Ownable(msg.sender) {
        if (registryAddress.code.length == 0) revert InvalidRegistry();
        registry = GravitasPolicyRegistry(registryAddress);
    }

    /// @notice Bind exactly one token whose immutable manager and registry point back here.
    /// @dev This is a one-time deployment step, not a transfer bypass or token replacement path.
    function initializeToken(address tokenAddress) external onlyOwner {
        if (gatedToken != address(0)) revert TokenAlreadyConfigured();
        if (tokenAddress.code.length == 0) revert InvalidToken();
        (bool registryOk, bytes memory registryData) = tokenAddress.staticcall(
            abi.encodeWithSelector(IGatedDemoSukukBinding.registry.selector)
        );
        (bool managerOk, bytes memory managerData) = tokenAddress.staticcall(
            abi.encodeWithSelector(IGatedDemoSukukBinding.manager.selector)
        );
        if (!registryOk || registryData.length != 32 || !managerOk || managerData.length != 32) {
            revert InvalidToken();
        }
        if (
            abi.decode(registryData, (uint256)) != uint256(uint160(address(registry)))
                || abi.decode(managerData, (uint256)) != uint256(uint160(address(this)))
        ) revert InvalidToken();
        gatedToken = tokenAddress;
        emit GatedTokenConfigured(tokenAddress);
    }

    function transferSukuk(bytes32 requestId, address from, address to, uint256 amount) external {
        address token = gatedToken;
        if (token == address(0)) revert TokenNotConfigured();
        if (msg.sender != from) revert CallerNotTokenOwner(msg.sender, from);
        if (requestId == bytes32(0)) revert InvalidRequestId();
        if (processedRequestIds[requestId]) revert RequestAlreadyProcessed(requestId);
        if (to == address(0)) revert InvalidRecipient();

        // The registry sees this manager as the caller. It verifies asset approval and
        // executor status; it does not establish investor identity or recipient eligibility.
        uint256 version = registry.checkSubscriptionCompliance(to, token);
        processedRequestIds[requestId] = true;
        IERC20(token).safeTransferFrom(from, to, amount);
        emit TransferChecked(requestId, token, from, to, amount, version, registry.policyHistory(version));
    }
}
