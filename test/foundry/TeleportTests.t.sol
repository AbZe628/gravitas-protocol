// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/Teleport.sol";
import "../../contracts/TeleportV3.sol";
import "../../contracts/GravitasPolicyRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract TeleportTests is Test {
    GravitasPolicyRegistry registry;
    Teleport teleportV2;
    TeleportV3 teleportV3;
    MockERC20 token0;
    MockERC20 token1;
    
    address owner = address(0x1);
    address executor = address(0x2);
    address user = address(0x3);

    function setUp() public {
        vm.startPrank(owner);
        registry = new GravitasPolicyRegistry();
        teleportV2 = new Teleport(address(registry));
        teleportV3 = new TeleportV3(address(0x10), address(0x11), address(registry));
        
        token0 = new MockERC20("Token 0", "TK0");
        token1 = new MockERC20("Token 1", "TK1");
        
        registry.setAssetCompliance(address(token0), true);
        registry.setAssetCompliance(address(token1), true);
        registry.setExecutorStatus(executor, true);
        registry.setRouterAuthorization(address(0x4), true);
        vm.stopPrank();
    }

    // --- Registry Tests ---
    function test_Registry_Versioning() public {
        uint256 versionBefore = registry.currentVersion();
        vm.prank(owner);
        registry.setAssetCompliance(address(0x99), true);
        assertEq(registry.currentVersion(), versionBefore + 1);
        assertTrue(registry.policyHistory(registry.currentVersion()) != bytes32(0));
    }

    // --- V2 Tests ---
    function test_V2_RevertOnNonAuthorized() public {
        vm.prank(user);
        vm.expectRevert("Teleport: not authorized");
        teleportV2.migrateLiquidityV2(address(0), address(0), address(0), address(0), 0, 0, 0, 0, address(0));
    }

    function test_V2_RevertOnNonCompliant() public {
        address badToken = address(0x666);
        vm.prank(executor);
        vm.expectRevert("Teleport: non-compliant assets");
        teleportV2.migrateLiquidityV2(address(0), address(0x4), address(token0), badToken, 0, 0, 0, block.timestamp, address(0));
    }

    function test_V2_PolicyUpdate() public {
        vm.prank(owner);
        teleportV2.setPolicy(30 minutes, 3000);
        assertEq(teleportV2.cooldownSeconds(), 30 minutes);
        assertEq(teleportV2.maxMoveBps(), 3000);
    }

    // --- V3 Tests ---
    function test_V3_RevertOnInvalidFee() public {
        TeleportV3.AtomicMigrationParams memory params;
        params.newFee = 400; 
        params.deadline = block.timestamp;
        
        vm.prank(executor);
        vm.expectRevert("TV3: Invalid fee tier");
        teleportV3.executeAtomicMigration(params, "");
    }

    function test_V3_RevertOnZeroSlippage() public {
        TeleportV3.AtomicMigrationParams memory params;
        params.newFee = 500;
        params.newTickLower = -100;
        params.newTickUpper = 100;
        params.deadline = block.timestamp;
        params.amount0MinMint = 0; 
        
        vm.prank(executor);
        vm.expectRevert("TV3: Zero slippage not allowed");
        teleportV3.executeAtomicMigration(params, "");
    }
}
