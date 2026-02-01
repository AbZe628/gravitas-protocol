// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/Teleport.sol";
import "../../contracts/TeleportV3.sol";
import "../../contracts/GravitasPolicyRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LocalMockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract TeleportTests is Test {
    GravitasPolicyRegistry registry;
    Teleport teleportV2;
    TeleportV3 teleportV3;
    LocalMockERC20 token0;
    LocalMockERC20 token1;
    
    address owner = address(0x1);
    address executor = address(0x2);
    address user = address(0x3);

    function setUp() public {
        vm.startPrank(owner);
        registry = new GravitasPolicyRegistry();
        teleportV2 = new Teleport(address(registry));
        teleportV3 = new TeleportV3(address(0x10), address(0x11), address(registry));
        
        token0 = new LocalMockERC20("Token 0", "TK0");
        token1 = new LocalMockERC20("Token 1", "TK1");
        
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

    function test_Registry_SetRouter() public {
        vm.prank(owner);
        registry.setRouterAuthorization(address(0x55), true);
        assertTrue(registry.isRouterAuthorized(address(0x55)));
    }

    function test_Registry_SetExecutor() public {
        vm.prank(owner);
        registry.setExecutorStatus(address(0x66), true);
        assertTrue(registry.isExecutor(address(0x66)));
    }

    function test_Registry_VerifyFunctions() public {
        assertTrue(registry.verifyAssetCompliance(address(token0)));
        assertTrue(registry.verifyRouterAuthorization(address(0x4)));
        assertTrue(registry.verifyExecutorStatus(executor));
        assertTrue(registry.areTokensCompliant(address(token0), address(token1)));
    }

    function test_Registry_RevertOnZeroAddress() public {
        vm.startPrank(owner);
        vm.expectRevert("GPR: Invalid asset address");
        registry.setAssetCompliance(address(0), true);
        vm.expectRevert("GPR: Invalid router address");
        registry.setRouterAuthorization(address(0), true);
        vm.expectRevert("GPR: Invalid executor address");
        registry.setExecutorStatus(address(0), true);
        vm.stopPrank();
    }

    function test_Registry_RevertOnNonOwner() public {
        vm.startPrank(user);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        registry.setAssetCompliance(address(token0), false);
        vm.expectRevert();
        registry.setRouterAuthorization(address(0x4), false);
        vm.expectRevert();
        registry.setExecutorStatus(executor, false);
        vm.stopPrank();
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

    function test_V2_RevertOnExpiredDeadline() public {
        vm.prank(executor);
        vm.expectRevert("Teleport: deadline passed");
        teleportV2.migrateLiquidityV2(address(0), address(0x4), address(token0), address(token1), 0, 0, 0, block.timestamp - 1, address(0));
    }

    function test_V2_RevertOnUnauthorizedRouter() public {
        vm.prank(executor);
        vm.expectRevert("Teleport: router not authorized");
        teleportV2.migrateLiquidityV2(address(0), address(0x5), address(token0), address(token1), 0, 0, 0, block.timestamp, address(0));
    }

    function test_V2_SetPolicy() public {
        vm.prank(owner);
        teleportV2.setPolicy(1 days, 5000);
        assertEq(teleportV2.cooldownSeconds(), 1 days);
        assertEq(teleportV2.maxMoveBps(), 5000);
    }

    function test_V2_SetPolicy_Revert() public {
        vm.startPrank(owner);
        vm.expectRevert("Teleport: cooldown too big");
        teleportV2.setPolicy(8 days, 1000);
        vm.expectRevert("Teleport: bad bps");
        teleportV2.setPolicy(1 days, 10001);
        vm.expectRevert("Teleport: bad bps");
        teleportV2.setPolicy(1 days, 0);
        vm.stopPrank();
    }

    function test_V2_RescueTokens_NonOwner() public {
        vm.prank(user);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        teleportV2.rescueTokens(address(token0), user);
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

    function test_V3_RevertOnInvalidTickSpacing() public {
        TeleportV3.AtomicMigrationParams memory params;
        params.newFee = 500; // spacing 10
        params.newTickLower = -123; // not divisible by 10
        params.newTickUpper = 100;
        params.deadline = block.timestamp;
        
        vm.prank(executor);
        vm.expectRevert("TV3: Invalid tick spacing");
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

    function test_V3_RevertOnDeadline() public {
        TeleportV3.AtomicMigrationParams memory params;
        params.deadline = block.timestamp - 1;
        
        vm.prank(executor);
        vm.expectRevert("TV3: Deadline expired");
        teleportV3.executeAtomicMigration(params, "");
    }

    function test_V3_NonAuthorized() public {
        vm.prank(user);
        vm.expectRevert("TV3: Not authorized executor");
        teleportV3.executeAtomicMigration(TeleportV3.AtomicMigrationParams({
            tokenId: 1, newFee: 500, newTickLower: -10, newTickUpper: 10,
            amount0MinMint: 1, amount1MinMint: 1, amount0MinDecrease: 1, amount1MinDecrease: 1,
            deadline: block.timestamp, executeSwap: false, zeroForOne: false,
            swapAmountIn: 0, swapAmountOutMin: 0, swapFeeTier: 500
        }), "");
    }
}
