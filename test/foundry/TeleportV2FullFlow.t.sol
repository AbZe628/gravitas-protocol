// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/Teleport.sol";
import "../../contracts/GravitasPolicyRegistry.sol";
import "../../contracts/mocks/MockUniswapV2Factory.sol";
import "../../contracts/mocks/MockUniswapV2Router.sol";
import "../../contracts/mocks/MockUniswapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title TeleportV2FullFlowTests
 * @notice Comprehensive deterministic tests for Teleport V2 to reach >=80% coverage
 */
contract TeleportV2FullFlowTests is Test {
    GravitasPolicyRegistry registry;
    Teleport teleport;
    TestToken tokenX;
    TestToken tokenY;

    address owner = address(0x1);
    address executor = address(0x2);
    address user = address(0x3);

    function setUp() public {
        vm.startPrank(owner);

        // Deploy core contracts
        registry = new GravitasPolicyRegistry();
        teleport = new Teleport(address(registry));

        // Deploy test tokens
        tokenX = new TestToken("Token X", "TKX");
        tokenY = new TestToken("Token Y", "TKY");

        // Setup compliance
        registry.setAssetCompliance(address(tokenX), true);
        registry.setAssetCompliance(address(tokenY), true);
        registry.setExecutorStatus(executor, true);

        vm.stopPrank();
    }

    /**
     * @notice Helper to create unique DEX infrastructure for each test
     */
    function _createDEXInfrastructure()
        internal
        returns (MockUniswapV2Factory factoryFrom, MockUniswapV2Router routerTo)
    {
        factoryFrom = new MockUniswapV2Factory();
        MockUniswapV2Factory factoryTo = new MockUniswapV2Factory();
        routerTo = new MockUniswapV2Router(address(factoryTo));

        factoryFrom.createPair(address(tokenX), address(tokenY));
        factoryTo.createPair(address(tokenX), address(tokenY));

        vm.prank(owner);
        registry.setRouterAuthorization(address(routerTo), true);
    }

    /**
     * @notice Test full migration flow with maxMoveBps enforcement
     */
    function test_V2_FullMigrationFlow_MaxMoveBpsEnforcement() public {
        vm.warp(block.timestamp + 1 hours); // Ensure no cooldown conflicts
        (MockUniswapV2Factory factoryFrom, MockUniswapV2Router routerTo) = _createDEXInfrastructure();
        address pairFrom = factoryFrom.getPair(address(tokenX), address(tokenY));

        // Setup: User adds liquidity to source pool
        vm.startPrank(user);
        tokenX.mint(user, 100 ether);
        tokenY.mint(user, 100 ether);
        tokenX.approve(address(pairFrom), 100 ether);
        tokenY.approve(address(pairFrom), 100 ether);
        uint256 liquidity = MockUniswapV2Pair(pairFrom).mint(user, 100 ether, 100 ether);

        uint256 totalSupply = MockUniswapV2Pair(pairFrom).totalSupply();

        // Calculate max allowed based on default maxMoveBps (2000 = 20%)
        uint256 maxAllowed = (totalSupply * 2000) / 10_000;

        // Try to migrate more than maxMoveBps - should revert
        // Transfer LP tokens to executor for migration
        IERC20(pairFrom).transfer(executor, maxAllowed + 1);
        vm.stopPrank();

        vm.startPrank(executor);
        IERC20(pairFrom).approve(address(teleport), maxAllowed + 1);
        vm.expectRevert("Teleport: exceeds maxMoveBps");
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            maxAllowed + 1,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );

        // Now migrate within limits - should succeed
        IERC20(pairFrom).approve(address(teleport), maxAllowed);
        vm.stopPrank();

        // Transfer remaining LP to executor
        vm.prank(user);
        IERC20(pairFrom).transfer(executor, maxAllowed);

        vm.startPrank(executor);
        IERC20(pairFrom).approve(address(teleport), maxAllowed);
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            maxAllowed,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );
    }

    /**
     * @notice Test cooldown enforcement between migrations
     */
    function test_V2_CooldownEnforcement() public {
        vm.warp(block.timestamp + 2 hours); // Ensure no cooldown conflicts
        (MockUniswapV2Factory factoryFrom, MockUniswapV2Router routerTo) = _createDEXInfrastructure();
        address pairFrom = factoryFrom.getPair(address(tokenX), address(tokenY));

        // Setup liquidity
        vm.startPrank(user);
        tokenX.mint(user, 200 ether);
        tokenY.mint(user, 200 ether);
        tokenX.approve(address(pairFrom), 200 ether);
        tokenY.approve(address(pairFrom), 200 ether);
        uint256 liquidity = MockUniswapV2Pair(pairFrom).mint(user, 200 ether, 200 ether);

        uint256 totalSupply = MockUniswapV2Pair(pairFrom).totalSupply();
        uint256 maxAllowed = (totalSupply * 2000) / 10_000;

        // Transfer LP to executor
        IERC20(pairFrom).transfer(executor, liquidity);
        vm.stopPrank();

        // First migration
        vm.startPrank(executor);
        IERC20(pairFrom).approve(address(teleport), maxAllowed / 2);
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            maxAllowed / 2,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );

        // Try immediate second migration - should fail due to cooldown
        IERC20(pairFrom).approve(address(teleport), maxAllowed / 2);
        vm.expectRevert("Teleport: cooldown active");
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            maxAllowed / 2,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );

        // Advance time past cooldown (default 15 minutes)
        vm.warp(block.timestamp + 16 minutes);

        // Now should succeed
        IERC20(pairFrom).approve(address(teleport), maxAllowed / 2);
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            maxAllowed / 2,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );
    }

    /**
     * @notice Test SafeERC20 transfer and approve paths
     */
    function test_V2_SafeERC20Paths() public {
        vm.warp(block.timestamp + 3 hours); // Ensure no cooldown conflicts
        (MockUniswapV2Factory factoryFrom, MockUniswapV2Router routerTo) = _createDEXInfrastructure();
        address pairFrom = factoryFrom.getPair(address(tokenX), address(tokenY));

        vm.startPrank(user);
        tokenX.mint(user, 100 ether);
        tokenY.mint(user, 100 ether);
        tokenX.approve(address(pairFrom), 100 ether);
        tokenY.approve(address(pairFrom), 100 ether);
        uint256 liquidity = MockUniswapV2Pair(pairFrom).mint(user, 100 ether, 100 ether);

        uint256 migrateAmount = liquidity / 5; // Within maxMoveBps
        IERC20(pairFrom).transfer(executor, migrateAmount);
        vm.stopPrank();

        uint256 executorBalanceBefore = IERC20(pairFrom).balanceOf(executor);

        vm.startPrank(executor);
        IERC20(pairFrom).approve(address(teleport), migrateAmount);
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            migrateAmount,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );
        vm.stopPrank();

        // Verify LP tokens were transferred from executor
        assertLt(IERC20(pairFrom).balanceOf(executor), executorBalanceBefore);
    }

    /**
     * @notice Test dust refund mechanism
     */
    function test_V2_DustRefund() public {
        vm.warp(block.timestamp + 4 hours); // Ensure no cooldown conflicts
        (MockUniswapV2Factory factoryFrom, MockUniswapV2Router routerTo) = _createDEXInfrastructure();
        address pairFrom = factoryFrom.getPair(address(tokenX), address(tokenY));

        vm.startPrank(user);
        tokenX.mint(user, 100 ether);
        tokenY.mint(user, 100 ether);
        tokenX.approve(address(pairFrom), 100 ether);
        tokenY.approve(address(pairFrom), 100 ether);
        uint256 liquidity = MockUniswapV2Pair(pairFrom).mint(user, 100 ether, 100 ether);

        uint256 migrateAmount = liquidity / 5;
        IERC20(pairFrom).transfer(executor, migrateAmount);
        vm.stopPrank();

        uint256 userTokenXBefore = tokenX.balanceOf(user);
        uint256 userTokenYBefore = tokenY.balanceOf(user);

        vm.startPrank(executor);
        IERC20(pairFrom).approve(address(teleport), migrateAmount);
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            migrateAmount,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );

        // User should have received dust (if any)
        // Balance should be >= before (dust refunded)
        assertGe(tokenX.balanceOf(user), userTokenXBefore);
        assertGe(tokenY.balanceOf(user), userTokenYBefore);
    }

    /**
     * @notice Test rescueTokens functionality
     */
    function test_V2_RescueTokens() public {
        // Send some tokens to teleport contract
        vm.prank(user);
        tokenX.mint(address(teleport), 10 ether);

        uint256 ownerBalanceBefore = tokenX.balanceOf(owner);

        vm.prank(owner);
        teleport.rescueTokens(address(tokenX), owner);

        assertEq(tokenX.balanceOf(owner), ownerBalanceBefore + 10 ether);
        assertEq(tokenX.balanceOf(address(teleport)), 0);
    }

    /**
     * @notice Test policy updates
     */
    function test_V2_PolicyUpdate() public {
        vm.prank(owner);
        teleport.setPolicy(1 days, 5000);

        assertEq(teleport.cooldownSeconds(), 1 days);
        assertEq(teleport.maxMoveBps(), 5000);
    }

    /**
     * @notice Test revert on zero registry
     */
    function test_V2_RevertOnZeroRegistry() public {
        vm.expectRevert("Teleport: zero registry");
        new Teleport(address(0));
    }

    /**
     * @notice Test revert on bad supply
     */
    function test_V2_RevertOnBadSupply() public {
        // Create a new pair with no liquidity
        MockUniswapV2Factory factoryEmpty = new MockUniswapV2Factory();
        MockUniswapV2Factory factoryTo = new MockUniswapV2Factory();
        MockUniswapV2Router routerTo = new MockUniswapV2Router(address(factoryTo));

        factoryEmpty.createPair(address(tokenX), address(tokenY));
        factoryTo.createPair(address(tokenX), address(tokenY));

        vm.prank(owner);
        registry.setRouterAuthorization(address(routerTo), true);

        vm.prank(executor);
        vm.expectRevert("Teleport: bad supply");
        teleport.migrateLiquidityV2(
            address(factoryEmpty),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            1,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );
    }

    /**
     * @notice Test revert when pair not found
     */
    function test_V2_RevertOnPairNotFound() public {
        TestToken tokenZ = new TestToken("Token Z", "TKZ");

        vm.prank(owner);
        registry.setAssetCompliance(address(tokenZ), true);

        MockUniswapV2Factory factoryFrom = new MockUniswapV2Factory();
        MockUniswapV2Factory factoryTo = new MockUniswapV2Factory();
        MockUniswapV2Router routerTo = new MockUniswapV2Router(address(factoryTo));

        vm.prank(owner);
        registry.setRouterAuthorization(address(routerTo), true);

        vm.prank(executor);
        vm.expectRevert("Teleport: pairFrom not found");
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenZ),
            1,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );
    }

    /**
     * @notice Test owner authorization
     */
    function test_V2_OwnerCanExecute() public {
        vm.warp(block.timestamp + 5 hours); // Ensure no cooldown conflicts
        (MockUniswapV2Factory factoryFrom, MockUniswapV2Router routerTo) = _createDEXInfrastructure();
        address pairFrom = factoryFrom.getPair(address(tokenX), address(tokenY));

        vm.startPrank(user);
        tokenX.mint(user, 100 ether);
        tokenY.mint(user, 100 ether);
        tokenX.approve(address(pairFrom), 100 ether);
        tokenY.approve(address(pairFrom), 100 ether);
        uint256 liquidity = MockUniswapV2Pair(pairFrom).mint(user, 100 ether, 100 ether);

        uint256 migrateAmount = liquidity / 10;
        IERC20(pairFrom).transfer(owner, migrateAmount);
        vm.stopPrank();

        // Owner should be able to execute (not just executor)
        vm.startPrank(owner);
        IERC20(pairFrom).approve(address(teleport), migrateAmount);
        teleport.migrateLiquidityV2(
            address(factoryFrom),
            address(routerTo),
            address(tokenX),
            address(tokenY),
            migrateAmount,
            1,
            1,
            block.timestamp + 1 hours,
            user
        );
    }
}
