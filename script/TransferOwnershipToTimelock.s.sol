// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/GravitasPolicyRegistry.sol";
import "../contracts/TeleportV2.sol";
import "../contracts/TeleportV3.sol";
import "../contracts/governance/GravitasTimelock.sol";

/**
 * @title TransferOwnershipToTimelock
 * @notice Hands the registry to the timelock in the two steps the registry
 *         actually requires.
 *
 * @dev The registry is Ownable2Step. `transferOwnership` only nominates; nothing
 *      moves until the nominee calls `acceptOwnership`. Since the nominee is a
 *      timelock, that acceptance is itself a scheduled operation which has to
 *      wait out the delay. There is no way to compress this into one
 *      transaction, and the earlier version of this script — a bare
 *      `transferOwnership` against a hard-coded address — would have left the
 *      registry nominated and never accepted, with the deployer still in
 *      control and the deployment looking finished.
 *
 *      Two calls, with the delay in between:
 *
 *        forge script script/TransferOwnershipToTimelock.s.sol --sig "propose()" \
 *          --rpc-url $RPC_URL --broadcast
 *
 *        ... wait out the timelock delay ...
 *
 *        forge script script/TransferOwnershipToTimelock.s.sol --sig "execute()" \
 *          --rpc-url $RPC_URL --broadcast
 *
 *      **The engines move too.** The registry was the only thing this script
 *      touched, which left TeleportV2 and TeleportV3 owned by the deployer's
 *      key — and their `onlyAuthorized` modifier short-circuits on
 *      `msg.sender == owner()`, so that key could execute migrations without
 *      the registry having any say. Handing over the registry alone and calling
 *      it done would have been the most expensive kind of half-measure: the
 *      governance claim would read as satisfied while the engines answered to
 *      one key.
 *
 *      Both engines are plain `Ownable`, not `Ownable2Step`, so their transfer
 *      completes in one call with no acceptance to schedule. That is a weaker
 *      guarantee than the registry's and it is why `verify()` exists: a
 *      single-step transfer to a wrong address is final.
 *
 *      **Know what this costs.** `pause()` on both engines is `onlyOwner`. Once
 *      the timelock owns them, pausing takes the timelock delay — so the
 *      emergency stop stops being an emergency stop. Nothing here can fix that;
 *      it needs a guardian role that pauses without the delay, which is a
 *      contract change and is recorded in docs/KNOWN-ISSUES.md. Until that
 *      ships, run `propose()` and decide deliberately whether the engines go
 *      with the registry or wait.
 *
 *      Required environment: DEPLOYER_KEY, REGISTRY, TIMELOCK, TELEPORT_V2,
 *      TELEPORT_V3.
 */
contract TransferOwnershipToTimelock is Script {
    bytes32 constant SALT = bytes32(0);

    function _targets() internal view returns (GravitasPolicyRegistry registry, GravitasTimelock timelock) {
        registry = GravitasPolicyRegistry(vm.envAddress("REGISTRY"));
        timelock = GravitasTimelock(payable(vm.envAddress("TIMELOCK")));
        require(address(registry).code.length > 0, "handover: no registry at REGISTRY");
        require(address(timelock).code.length > 0, "handover: no timelock at TIMELOCK");
    }

    function _engines() internal view returns (TeleportV2 v2, TeleportV3 v3) {
        v2 = TeleportV2(vm.envAddress("TELEPORT_V2"));
        v3 = TeleportV3(vm.envAddress("TELEPORT_V3"));
        require(address(v2).code.length > 0, "handover: no contract at TELEPORT_V2");
        require(address(v3).code.length > 0, "handover: no contract at TELEPORT_V3");
    }

    /// @notice Nominate the timelock, and schedule the timelock's own acceptance.
    function propose() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        (GravitasPolicyRegistry registry, GravitasTimelock timelock) = _targets();

        require(registry.owner() == vm.addr(deployerKey), "handover: deployer is not the current owner");

        bytes memory acceptCall = abi.encodeCall(Ownable2Step.acceptOwnership, ());
        uint256 delay = timelock.getMinDelay();

        vm.startBroadcast(deployerKey);
        registry.transferOwnership(address(timelock));
        timelock.schedule(address(registry), 0, acceptCall, bytes32(0), SALT, delay);
        vm.stopBroadcast();

        console.log("registry           ", address(registry));
        console.log("nominated owner    ", registry.pendingOwner());
        console.log("acceptance operation id:");
        console.logBytes32(timelock.hashOperation(address(registry), 0, acceptCall, bytes32(0), SALT));
        console.log("executable after   ", block.timestamp + delay);
        console.log("");
        console.log("The registry is nominated, not transferred. Run execute() once the");
        console.log("delay has passed, then confirm owner() reads as the timelock.");
    }

    /**
     * @notice Move both engines to the timelock. One call each, and final.
     * @dev Separate from propose() on purpose. The registry handover is
     *      reversible right up until the timelock accepts; these are not, and
     *      they cost the fast pause. Deciding them together in one transaction
     *      would hide that.
     */
    function engines() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        (, GravitasTimelock timelock) = _targets();
        (TeleportV2 v2, TeleportV3 v3) = _engines();
        address deployer = vm.addr(deployerKey);

        require(v2.owner() == deployer, "handover: deployer does not own TeleportV2");
        require(v3.owner() == deployer, "handover: deployer does not own TeleportV3");

        vm.startBroadcast(deployerKey);
        v2.transferOwnership(address(timelock));
        v3.transferOwnership(address(timelock));
        vm.stopBroadcast();

        require(v2.owner() == address(timelock), "handover: TeleportV2 owner did not move");
        require(v3.owner() == address(timelock), "handover: TeleportV3 owner did not move");

        console.log("TeleportV2 owner", v2.owner());
        console.log("TeleportV3 owner", v3.owner());
        console.log("");
        console.log("Both engines now answer to the timelock, including pause().");
        console.log("An emergency stop now waits out the delay. That is the trade.");
    }

    /// @notice Read back who owns what. Run it after every step.
    function verify() external view {
        (GravitasPolicyRegistry registry, GravitasTimelock timelock) = _targets();
        (TeleportV2 v2, TeleportV3 v3) = _engines();

        console.log("timelock          ", address(timelock));
        console.log("registry owner    ", registry.owner());
        console.log("registry pending  ", registry.pendingOwner());
        console.log("TeleportV2 owner  ", v2.owner());
        console.log("TeleportV3 owner  ", v3.owner());
    }

    /// @notice Execute the scheduled acceptance once the delay has passed.
    function execute() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        (GravitasPolicyRegistry registry, GravitasTimelock timelock) = _targets();

        bytes memory acceptCall = abi.encodeCall(Ownable2Step.acceptOwnership, ());
        bytes32 id = timelock.hashOperation(address(registry), 0, acceptCall, bytes32(0), SALT);
        require(timelock.isOperationReady(id), "handover: not ready, the delay has not passed");

        vm.startBroadcast(deployerKey);
        timelock.execute(address(registry), 0, acceptCall, bytes32(0), SALT);
        vm.stopBroadcast();

        console.log("registry owner is now", registry.owner());
        require(registry.owner() == address(timelock), "handover: owner did not move");
    }
}
