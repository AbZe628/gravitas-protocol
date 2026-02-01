// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GravitasPolicyRegistry.sol";

// --- Interfaces ---
interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function totalSupply() external view returns (uint256);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV2Router01 {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
}

// --- End Interfaces ---

/**
 * @title TeleportV2 (Institutional Edition)
 * @notice The core V2 engine for deterministic liquidity migration between V2-compatible DEXs.
 * @dev This contract implements the "Policy-Constrained Smart Routing" logic, ensuring
 *      atomic execution and compliance with Shariah governance rules via the Policy Registry.
 */
contract Teleport is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Immutable reference to the Gravitas Policy Registry contract.
    GravitasPolicyRegistry public immutable registry;

    // --------------------
    // Policy Controls
    // --------------------
    /// @notice Minimum time (in seconds) that must pass between migrations for the same pair/router combination.
    uint256 public cooldownSeconds = 15 minutes;

    /// @notice Maximum percentage of the total LP balance that can be moved in a single transaction, in Basis Points (e.g., 2000 = 20%).
    uint256 public maxMoveBps = 2000;

    /// @dev Mapping to track the last migration timestamp for a unique migration key (factory, pair, router, tokens).
    mapping(bytes32 => uint256) public lastMigrationAt;

    /// @dev Emitted when the protocol's core risk policies are updated by the owner.
    event PolicyUpdated(uint256 cooldownSeconds, uint256 maxMoveBps);

    /// @dev Emitted upon successful atomic liquidity migration.
    event LiquidityMigrated(
        address indexed executor,
        address indexed factoryFrom,
        address indexed routerTo,
        address pairFrom,
        address tokenA,
        address tokenB,
        uint256 lpBurned,
        uint256 liquidityMinted,
        address recipient
    );

    /**
     * @dev Modifier to ensure the caller is either the contract owner or an authorized executor in the Policy Registry.
     */
    modifier onlyAuthorized() {
        require(registry.isExecutor(msg.sender) || msg.sender == owner(), "Teleport: not authorized");
        _;
    }

    /**
     * @notice Initializes the Teleport contract with the address of the Gravitas Policy Registry.
     * @param _registry The address of the deployed GravitasPolicyRegistry contract.
     */
    constructor(address _registry) Ownable(msg.sender) {
        require(_registry != address(0), "Teleport: zero registry");
        registry = GravitasPolicyRegistry(_registry);
    }

    /**
     * @notice Updates the core risk policies (cooldown and max move percentage).
     * @param _cooldownSeconds The new cooldown period.
     * @param _maxMoveBps The new maximum move percentage in Basis Points.
     */
    function setPolicy(uint256 _cooldownSeconds, uint256 _maxMoveBps) external onlyOwner {
        require(_cooldownSeconds <= 7 days, "Teleport: cooldown too big");
        require(_maxMoveBps > 0 && _maxMoveBps <= 10_000, "Teleport: bad bps");
        cooldownSeconds = _cooldownSeconds;
        maxMoveBps = _maxMoveBps;
        emit PolicyUpdated(_cooldownSeconds, _maxMoveBps);
    }

    /**
     * @notice Executes an atomic liquidity migration from a source V2 pair to a target V2 router.
     * @param factoryFrom The address of the source DEX factory.
     * @param routerTo The address of the target DEX router.
     * @param tokenA The address of the first token in the pair.
     * @param tokenB The address of the second token in the pair.
     * @param lpAmount The amount of LP tokens to burn from the source pool.
     * @param amountAMin The minimum amount of tokenA to accept from the burn (slippage control).
     * @param amountBMin The minimum amount of tokenB to accept from the burn (slippage control).
     * @param deadline Unix timestamp by which the transaction must be included.
     * @param recipient The address to receive the new LP tokens and any dust.
     */
    function migrateLiquidityV2(
        address factoryFrom,
        address routerTo,
        address tokenA,
        address tokenB,
        uint256 lpAmount,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline,
        address recipient
    ) external nonReentrant onlyAuthorized {
        // 1. Basic Checks
        require(deadline >= block.timestamp, "Teleport: deadline passed");
        require(registry.isRouterAuthorized(routerTo), "Teleport: router not authorized");
        require(registry.areTokensCompliant(tokenA, tokenB), "Teleport: non-compliant assets");

        // 2. Pair Identification
        address pairFrom = IUniswapV2Factory(factoryFrom).getPair(tokenA, tokenB);
        require(pairFrom != address(0), "Teleport: pairFrom not found");

        // 3. Policy Enforcement (On-chain supply check)
        uint256 totalSupply = IUniswapV2Pair(pairFrom).totalSupply();
        require(totalSupply > 0, "Teleport: bad supply");
        uint256 maxAllowed = (totalSupply * maxMoveBps) / 10_000;
        require(lpAmount <= maxAllowed, "Teleport: exceeds maxMoveBps");

        bytes32 key = keccak256(abi.encodePacked(factoryFrom, pairFrom, routerTo, tokenA, tokenB));
        require(block.timestamp >= lastMigrationAt[key] + cooldownSeconds, "Teleport: cooldown active");

        // 4. Execution: Burn (Remove Liquidity)
        IERC20(pairFrom).safeTransferFrom(msg.sender, address(this), lpAmount);
        IERC20(pairFrom).safeTransfer(pairFrom, lpAmount);
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(pairFrom).burn(address(this));

        // 5. Token Mapping
        address t0 = IUniswapV2Pair(pairFrom).token0();
        uint256 amountAOut = (t0 == tokenA) ? amount0 : amount1;
        uint256 amountBOut = (t0 == tokenA) ? amount1 : amount0;

        // 6. Execution: Add Liquidity
        IERC20(tokenA).forceApprove(routerTo, amountAOut);
        IERC20(tokenB).forceApprove(routerTo, amountBOut);

        (,, uint256 liquidityMinted) = IUniswapV2Router01(routerTo)
            .addLiquidity(tokenA, tokenB, amountAOut, amountBOut, amountAMin, amountBMin, recipient, deadline);

        // 7. Cleanup & State Update
        _refundDust(tokenA, recipient);
        _refundDust(tokenB, recipient);
        lastMigrationAt[key] = block.timestamp;

        emit LiquidityMigrated(
            msg.sender, factoryFrom, routerTo, pairFrom, tokenA, tokenB, lpAmount, liquidityMinted, recipient
        );
    }

    function _refundDust(address token, address recipient) internal {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(recipient, balance);
        }
    }

    function rescueTokens(address token, address to) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) IERC20(token).safeTransfer(to, bal);
    }
}
