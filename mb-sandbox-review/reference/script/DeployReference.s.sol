// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.24;

/* REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION. */
import {Script} from "forge-std/Script.sol";
import {GravitasPolicyRegistry} from "contracts/GravitasPolicyRegistry.sol";
import {MockERC20} from "contracts/MockERC20.sol";
import {GatedDemoSukuk} from "../src/GatedDemoSukuk.sol";
import {DemoSukukManager} from "../src/DemoSukukManager.sol";

contract DeployReference is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("ANVIL_PRIVATE_KEY");
        address holder = vm.envAddress("DEMO_HOLDER");
        vm.startBroadcast(deployerKey);

        GravitasPolicyRegistry registry = new GravitasPolicyRegistry();
        MockERC20 gusd = new MockERC20();
        DemoSukukManager manager = new DemoSukukManager(address(registry));
        GatedDemoSukuk token = new GatedDemoSukuk(address(registry), address(manager), holder, 10_000 ether);
        manager.initializeToken(address(token));
        registry.setAssetCompliance(address(token), true);
        registry.setExecutorStatus(address(manager), true);

        vm.stopBroadcast();
        string memory json = "deployment";
        vm.serializeAddress(json, "registry", address(registry));
        vm.serializeAddress(json, "gusd", address(gusd));
        vm.serializeAddress(json, "gatedToken", address(token));
        string memory result = vm.serializeAddress(json, "manager", address(manager));
        vm.writeFile("deployments/local.json", result);
    }
}
