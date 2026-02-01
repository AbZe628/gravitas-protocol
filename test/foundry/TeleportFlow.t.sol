// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/Teleport.sol";
import "../../contracts/GravitasPolicyRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LocalMockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract TeleportFlowTests is Test {
    GravitasPolicyRegistry registry;
    Teleport teleportV2;
    LocalMockERC20 t0;

    address owner = address(0x1);

    function setUp() public {
        vm.startPrank(owner);
        registry = new GravitasPolicyRegistry();
        teleportV2 = new Teleport(address(registry));
        t0 = new LocalMockERC20("T0", "T0");
        vm.stopPrank();
    }

    function test_V2_RescueTokens() public {
        t0.mint(address(teleportV2), 500);
        vm.prank(owner);
        teleportV2.rescueTokens(address(t0), owner);
        assertEq(t0.balanceOf(owner), 500);
    }
}
