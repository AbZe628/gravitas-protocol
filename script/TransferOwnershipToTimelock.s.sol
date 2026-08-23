// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/GravitasPolicyRegistry.sol";
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
 *      Required environment: DEPLOYER_KEY, REGISTRY, TIMELOCK.
 */
contract TransferOwnershipToTimelock is Script {
    bytes32 constant SALT = bytes32(0);

    function _targets() internal view returns (GravitasPolicyRegistry registry, GravitasTimelock timelock) {
        registry = GravitasPolicyRegistry(vm.envAddress("REGISTRY"));
        timelock = GravitasTimelock(payable(vm.envAddress("TIMELOCK")));
        require(address(registry).code.length > 0, "handover: no registry at REGISTRY");
        require(address(timelock).code.length > 0, "handover: no timelock at TIMELOCK");
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
