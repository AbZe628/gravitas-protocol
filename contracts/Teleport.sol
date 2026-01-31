// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GravitasPolicyRegistry.sol";

/**
 * @title Teleport (Institutional Edition)
 * @notice Deterministic Liquidity Routing Engine with Shariah-compliant filtering.
 * @dev Refactored for architectural alignment with the Gravitas Protocol vision.
 */
contract Teleport is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    GravitasPolicyRegistry public immutable registry;

    // --------------------
    // Policy Controls
    // --------------------
    uint256 public cooldownSeconds = 15 minutes;
    uint256 public maxMoveBps = 2000; // 20%

    mapping(bytes32 => uint256) public lastMigrationAt;

    event PolicyUpdated(uint256 cooldownSeconds, uint256 maxMoveBps);
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

    modifier onlyAuthorized() {
        require(registry.isExecutor(msg.sender) || msg.sender == owner(), "Teleport: not authorized");
        _;
    }

    constructor(address _registry) Ownable(msg.sender) {
        require(_registry != address(0), "Teleport: zero registry");
        registry = GravitasPolicyRegistry(_registry);
    }

    function setPolicy(uint256 _cooldownSeconds, uint256 _maxMoveBps) external onlyOwner {
        require(_cooldownSeconds <= 7 days, "Teleport: cooldown too big");
        require(_maxMoveBps > 0 && _maxMoveBps <= 10_000, "Teleport: bad bps");
        cooldownSeconds = _cooldownSeconds;
        maxMoveBps = _maxMoveBps;
        emit PolicyUpdated(_cooldownSeconds, _maxMoveBps);
    }

    /**
     * @notice Migrates liquidity between V2-compatible DEXs with Shariah filtering.
     */
    function migrateLiquidityV2(
        address factoryFrom,
        address routerTo,
        address tokenA,
        address tokenB,
        uint256 lpAmount,
        uint256 referenceLpBalance,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline,
        address recipient
    ) external nonReentrant onlyAuthorized {
        // 1. Compliance & Authorization Checks
        require(registry.isRouterAuthorized(routerTo), "Teleport: router not authorized");
        require(registry.areTokensCompliant(tokenA, tokenB), "Teleport: non-compliant assets");
        require(deadline >= block.timestamp, "Teleport: deadline passed");

        // 2. Policy Enforcement
        require(referenceLpBalance > 0, "Teleport: bad reference");
        uint256 maxAllowed = (referenceLpBalance * maxMoveBps) / 10_000;
        require(lpAmount <= maxAllowed, "Teleport: exceeds maxMoveBps");

        address pairFrom = IUniswapV2Factory(factoryFrom).getPair(tokenA, tokenB);
        require(pairFrom != address(0), "Teleport: pairFrom not found");

        bytes32 key = keccak256(abi.encodePacked(factoryFrom, pairFrom, routerTo, tokenA, tokenB));
        require(block.timestamp >= lastMigrationAt[key] + cooldownSeconds, "Teleport: cooldown active");

        // 3. Execution: Burn
        IERC20(pairFrom).safeTransferFrom(msg.sender, address(this), lpAmount);
        IERC20(pairFrom).safeTransfer(pairFrom, lpAmount);
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(pairFrom).burn(address(this));

        // 4. Token Mapping
        address t0 = IUniswapV2Pair(pairFrom).token0();
        uint256 amountAOut = (t0 == tokenA) ? amount0 : amount1;
        uint256 amountBOut = (t0 == tokenA) ? amount1 : amount0;

        // 5. Execution: Add Liquidity
        IERC20(tokenA).forceApprove(routerTo, amountAOut);
        IERC20(tokenB).forceApprove(routerTo, amountBOut);

        (,, uint256 liquidityMinted) = IUniswapV2Router01(routerTo).addLiquidity(
            tokenA,
            tokenB,
            amountAOut,
            amountBOut,
            amountAMin,
            amountBMin,
            recipient,
            deadline
        );

        // 6. Cleanup & State Update
        _refundDust(tokenA, recipient);
        _refundDust(tokenB, recipient);
        lastMigrationAt[key] = block.timestamp;

        emit LiquidityMigrated(
            msg.sender,
            factoryFrom,
            routerTo,
            pairFrom,
            tokenA,
            tokenB,
            lpAmount,
            liquidityMinted,
            recipient
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

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
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
