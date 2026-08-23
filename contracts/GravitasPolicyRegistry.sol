// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IShariahPolicyChecker.sol";

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
contract GravitasPolicyRegistry is Ownable2Step, Pausable, IShariahPolicyChecker {
    // ═══════════════════════════════════════════════════════════════════════════════════
    //                              STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════

    mapping(address => bool) public isAssetCompliant;
    mapping(address => bool) public isRouterAuthorized;
    mapping(address => bool) public isExecutor;

    // Policy Versioning
    uint256 public currentVersion;
    mapping(uint256 => bytes32) public policyHistory;

    // Which register a change touched. Folded into the hash so that moving an
    // address between registers cannot produce the same commitment.
    bytes32 private constant FIELD_ASSET = keccak256("asset");
    bytes32 private constant FIELD_ROUTER = keccak256("router");
    bytes32 private constant FIELD_EXECUTOR = keccak256("executor");

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                                   EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════

    event AssetComplianceUpdated(address indexed asset, bool status);
    event RouterAuthorizationUpdated(address indexed router, bool status);
    event ExecutorStatusUpdated(address indexed executor, bool status);
    event PolicyUpdated(uint256 indexed version, bytes32 policyHash);

    constructor() Ownable(msg.sender) {
        // The deployer's executor right is a policy decision like any other. It
        // belongs in the event log and in the hash chain, or anything rebuilding
        // the executor set from events starts with this grant missing.
        isExecutor[msg.sender] = true;
        _recordChange(FIELD_EXECUTOR, msg.sender, true);
        emit ExecutorStatusUpdated(msg.sender, true);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           COMPLIANCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════════

    function setAssetCompliance(address asset, bool status) external onlyOwner {
        require(asset != address(0), "GPR: Invalid asset address");
        if (isAssetCompliant[asset] == status) return;
        isAssetCompliant[asset] = status;
        _recordChange(FIELD_ASSET, asset, status);
        emit AssetComplianceUpdated(asset, status);
    }

    function setRouterAuthorization(address router, bool status) external onlyOwner {
        require(router != address(0), "GPR: Invalid router address");
        if (isRouterAuthorized[router] == status) return;
        isRouterAuthorized[router] = status;
        _recordChange(FIELD_ROUTER, router, status);
        emit RouterAuthorizationUpdated(router, status);
    }

    function setExecutorStatus(address executor, bool status) external onlyOwner {
        require(executor != address(0), "GPR: Invalid executor address");
        if (isExecutor[executor] == status) return;
        isExecutor[executor] = status;
        _recordChange(FIELD_EXECUTOR, executor, status);
        emit ExecutorStatusUpdated(executor, status);
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

    /**
     * @notice Records one policy change and extends the commitment chain.
     * @dev The previous version hashed the timestamp, the sender and the version
     *      number — metadata about the write, carrying nothing derived from the
     *      policy. Two entirely different registries produced the same hash if
     *      written in the same block by the same owner at the same version, and
     *      the same registry produced a different one when re-recorded later. It
     *      could not answer the question it existed to answer.
     *
     *      Each change is now folded into the hash before it, so
     *      policyHistory[v] commits to the whole ordered sequence of changes
     *      that produced version v. An observer replays PolicyUpdated from
     *      genesis, recomputes, and compares. "Is what runs what the board
     *      approved" becomes a comparison rather than testimony.
     *
     *      policyHistory[0] is zero and is the genesis of the chain.
     */
    function _recordChange(bytes32 field, address subject, bool status) internal {
        currentVersion++;
        bytes32 policyHash = keccak256(abi.encode(policyHistory[currentVersion - 1], field, subject, status));
        policyHistory[currentVersion] = policyHash;
        emit PolicyUpdated(currentVersion, policyHash);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           COMPLIANCE VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════════════
    //
    // SECURITY: Every verification entry point is gated by whenNotPaused. Pausing the
    // registry is therefore a real, system-wide compliance kill switch: it fails every
    // integrator that routes through this API (TeleportV2/V3 and any external caller such
    // as an integrating fund-subscription manager) closed, not open. `whenNotPaused` reverts with
    // EnforcedPause() rather than returning false, so a paused registry can never be
    // misread as "all assets non-compliant but calls still succeed". The raw storage
    // getters (isAssetCompliant / isRouterAuthorized / isExecutor mappings) remain
    // ungated by design — they are direct state reads, not the enforcement API, and the
    // enforcement path (verify*/check*) always flows through the guarded functions below.

    function areTokensCompliant(address tokenA, address tokenB) external view whenNotPaused returns (bool compliant) {
        compliant = isAssetCompliant[tokenA] && isAssetCompliant[tokenB];
    }

    function verifyAssetCompliance(address asset) external view whenNotPaused returns (bool compliant) {
        compliant = isAssetCompliant[asset];
    }

    function verifyRouterAuthorization(address router) external view whenNotPaused returns (bool authorized) {
        authorized = isRouterAuthorized[router];
    }

    function verifyExecutorStatus(address executor) external view whenNotPaused returns (bool authorized) {
        authorized = isExecutor[executor];
    }

    /**
     * @notice Single-call compliance gate for an integrating platform's subscription flow.
     * @dev Checks two conditions atomically:
     *      1. subscriptionToken is Shariah-compliant (asset whitelist)
     *      2. msg.sender (the calling contract, e.g. an integrating fund manager) is an
     *         authorized institutional executor — NOT the end subscriber.
     *         The subscriber parameter is reserved for future per-investor policy logic.
     * @param subscriber The end-investor address (reserved for future use; not checked in v1).
     * @param subscriptionToken The ERC-20 token address being subscribed to.
     * @return policyVersion The current governance version, for audit trail recording.
     */
    function checkSubscriptionCompliance(address subscriber, address subscriptionToken)
        external
        view
        whenNotPaused
        returns (uint256 policyVersion)
    {
        require(isAssetCompliant[subscriptionToken], "GPR: Asset not Shariah-compliant");
        require(isExecutor[msg.sender], "GPR: Calling contract not an authorized executor");
        // subscriber is passed through for future per-investor KYC policy expansion
        return currentVersion;
    }

    function getPolicyVersion() external view returns (uint256 policyVersion) {
        policyVersion = currentVersion;
    }
}
