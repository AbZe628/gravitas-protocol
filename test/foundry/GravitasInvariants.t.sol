// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/Teleport.sol";
import "../../contracts/GravitasPolicyRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockToken
 * @dev Simple ERC20 for testing purposes.
 */
contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }
}

/**
 * @title GravitasInvariants
 * @notice Foundry Invariant and Fuzz Testing suite for Gravitas Protocol.
 */
contract GravitasInvariants is Test {
    GravitasPolicyRegistry public registry;
    Teleport public teleport;
    MockToken public tokenA;
    MockToken public tokenB;
    MockToken public nonCompliantToken;

    address public owner = address(0x1);
    address public executor = address(0x2);
    address public user = address(0x3);

    function setUp() public {
        vm.startPrank(owner);
        registry = new GravitasPolicyRegistry();
        teleport = new Teleport(address(registry));

        tokenA = new MockToken("Token A", "TKNA");
        tokenB = new MockToken("Token B", "TKNB");
        nonCompliantToken = new MockToken("Non-Compliant", "BAD");

        registry.setAssetCompliance(address(tokenA), true);
        registry.setAssetCompliance(address(tokenB), true);
        registry.setRouterAuthorization(address(0x4), true); // Mock Router
        registry.setExecutorStatus(executor, true);
        vm.stopPrank();
    }

    function testFuzz_ComplianceInvariant(address randomToken) public {
        vm.assume(randomToken != address(tokenA) && randomToken != address(tokenB));
        assertFalse(registry.isAssetCompliant(randomToken));

        vm.prank(executor);
        vm.expectRevert("Teleport: non-compliant assets");
        teleport.migrateLiquidityV2(
            address(0x5), // factory
            address(0x4), // router
            address(tokenA),
            randomToken,
            100,
            0,
            0,
            block.timestamp + 1,
            user
        );
    }

    function test_AssetIntegrityInvariant() public {
        uint256 balA = tokenA.balanceOf(address(teleport));
        uint256 balB = tokenB.balanceOf(address(teleport));
        assertEq(balA, 0);
        assertEq(balB, 0);
    }
}
