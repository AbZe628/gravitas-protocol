// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * Teleport.sol (Reviewer-proof MVP - OZ 5.0 Compatible)
 */

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function burn(address to) external returns (uint amount0, uint amount1);
}

interface IUniswapV2Router01 {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

contract Teleport is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --------------------
    // Owner + Access Control
    // --------------------
    address public owner;

    mapping(address => bool) public isExecutor;      
    mapping(address => bool) public allowedRouter;   

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ExecutorSet(address indexed executor, bool allowed);
    event RouterAllowed(address indexed router, bool allowed);

    modifier onlyOwner() {
        require(msg.sender == owner, "Teleport: caller is not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || isExecutor[msg.sender], "Teleport: not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Teleport: zero addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setExecutor(address executor, bool allowed) external onlyOwner {
        require(executor != address(0), "Teleport: zero executor");
        isExecutor[executor] = allowed;
        emit ExecutorSet(executor, allowed);
    }

    function setAllowedRouter(address router, bool allowed) external onlyOwner {
        require(router != address(0), "Teleport: zero router");
        allowedRouter[router] = allowed;
        emit RouterAllowed(router, allowed);
    }

    // --------------------
    // Deterministic Policy Controls
    // --------------------
    uint256 public cooldownSeconds = 15 minutes;
    uint256 public maxMoveBps = 2000; // 20%

    mapping(bytes32 => uint256) public lastMigrationAt;

    event PolicyUpdated(uint256 cooldownSeconds, uint256 maxMoveBps);

    function setPolicy(uint256 _cooldownSeconds, uint256 _maxMoveBps) external onlyOwner {
        require(_cooldownSeconds <= 7 days, "Teleport: cooldown too big");
        require(_maxMoveBps > 0 && _maxMoveBps <= 10_000, "Teleport: bad bps");
        cooldownSeconds = _cooldownSeconds;
        maxMoveBps = _maxMoveBps;
        emit PolicyUpdated(_cooldownSeconds, _maxMoveBps);
    }

    // --------------------
    // Events
    // --------------------
    event LiquidityMigratedViaRouter(
        address indexed executor,
        address indexed factoryFrom,
        address indexed routerTo,
        address pairFrom,
        address tokenA,
        address tokenB,
        uint lpBurned,
        uint amountAOut,
        uint amountBOut,
        uint amountAUsed,
        uint amountBUsed,
        uint liquidityMinted,
        address recipient,
        uint deadline,
        uint cooldownSeconds,
        uint maxMoveBps
    );

    // --------------------
    // Core Logic
    // --------------------
    function migrateLiquidityV2ViaRouterPolicy(
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
        require(factoryFrom != address(0), "Teleport: zero factoryFrom");
        require(routerTo != address(0), "Teleport: zero router");
        require(allowedRouter[routerTo], "Teleport: router not allowed");
        require(tokenA != address(0) && tokenB != address(0), "Teleport: zero token");
        require(tokenA != tokenB, "Teleport: same token");
        require(lpAmount > 0, "Teleport: zero LP");
        require(recipient != address(0), "Teleport: zero recipient");
        require(deadline >= block.timestamp, "Teleport: deadline passed");

        // maxMoveBps cap
        require(referenceLpBalance > 0, "Teleport: bad reference");
        uint256 maxAllowed = (referenceLpBalance * maxMoveBps) / 10_000;
        require(lpAmount <= maxAllowed, "Teleport: exceeds maxMoveBps");

        // find source pair
        address pairFrom = IUniswapV2Factory(factoryFrom).getPair(tokenA, tokenB);
        require(pairFrom != address(0), "Teleport: pairFrom not found");

        // cooldown check
        bytes32 key = keccak256(abi.encodePacked(factoryFrom, pairFrom, routerTo, tokenA, tokenB));
        uint256 lastAt = lastMigrationAt[key];
        require(lastAt == 0 || block.timestamp >= lastAt + cooldownSeconds, "Teleport: cooldown");

        // Pull LP from caller
        IERC20(pairFrom).safeTransferFrom(msg.sender, address(this), lpAmount);

        // Send LP to pair and burn
        IERC20(pairFrom).safeTransfer(pairFrom, lpAmount);
        (uint amount0, uint amount1) = IUniswapV2Pair(pairFrom).burn(address(this));

        // Map outputs
        address t0 = IUniswapV2Pair(pairFrom).token0();
        address t1 = IUniswapV2Pair(pairFrom).token1();
        require((t0 == tokenA && t1 == tokenB) || (t0 == tokenB && t1 == tokenA), "Teleport: token mismatch");

        uint amountAOut;
        uint amountBOut;

        if (t0 == tokenA) {
            amountAOut = amount0;
            amountBOut = amount1;
        } else {
            amountAOut = amount1;
            amountBOut = amount0;
        }

        require(amountAOut > 0 && amountBOut > 0, "Teleport: burn zero out");

        // --- FIX ZA NOVI OPENZEPPELIN (v5.0+) ---
        // Koristimo forceApprove umjesto safeApprove. 
        // forceApprove automatski rješava "reset to 0" problem za USDT.
        IERC20(tokenA).forceApprove(routerTo, amountAOut);
        IERC20(tokenB).forceApprove(routerTo, amountBOut);

        // Deposit via Router
        (uint amountAUsed, uint amountBUsed, uint liquidityMinted) =
            IUniswapV2Router01(routerTo).addLiquidity(
                tokenA,
                tokenB,
                amountAOut,
                amountBOut,
                amountAMin,
                amountBMin,
                recipient,
                deadline
            );

        // Refund dust
        uint leftoverA = IERC20(tokenA).balanceOf(address(this));
        if (leftoverA > 0) IERC20(tokenA).safeTransfer(recipient, leftoverA);

        uint leftoverB = IERC20(tokenB).balanceOf(address(this));
        if (leftoverB > 0) IERC20(tokenB).safeTransfer(recipient, leftoverB);

        // Mark cooldown
        lastMigrationAt[key] = block.timestamp;

        emit LiquidityMigratedViaRouter(
            msg.sender,
            factoryFrom,
            routerTo,
            pairFrom,
            tokenA,
            tokenB,
            lpAmount,
            amountAOut,
            amountBOut,
            amountAUsed,
            amountBUsed,
            liquidityMinted,
            recipient,
            deadline,
            cooldownSeconds,
            maxMoveBps
        );
    }

    function rescueTokens(address token, address to) external onlyOwner {
        require(token != address(0) && to != address(0), "Teleport: zero addr");
        uint bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) IERC20(token).safeTransfer(to, bal);
    }
}