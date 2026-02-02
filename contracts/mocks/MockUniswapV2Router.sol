// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockUniswapV2Pair.sol";
import "./MockUniswapV2Factory.sol";

/**
 * @title MockUniswapV2Router
 * @notice Minimal deterministic mock for Uniswap V2 Router testing
 * @dev Used for testing only - not for production deployment
 */
contract MockUniswapV2Router {
    using SafeERC20 for IERC20;

    address public immutable factory;

    constructor(address _factory) {
        require(_factory != address(0), "MockRouter: zero factory");
        factory = _factory;
    }

    /**
     * @notice Adds liquidity to a pair
     * @dev Simplified version that doesn't handle optimal amounts
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(deadline >= block.timestamp, "MockRouter: expired");

        // Get or create pair
        address pair = MockUniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "MockRouter: pair not found");

        // For simplicity, use desired amounts directly
        amountA = amountADesired;
        amountB = amountBDesired;

        require(amountA >= amountAMin, "MockRouter: insufficient A amount");
        require(amountB >= amountBMin, "MockRouter: insufficient B amount");

        // Transfer tokens from sender to this contract
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        // Approve pair to spend tokens
        IERC20(tokenA).forceApprove(pair, amountA);
        IERC20(tokenB).forceApprove(pair, amountB);

        // Mint LP tokens
        liquidity = MockUniswapV2Pair(pair).mint(to, amountA, amountB);
    }

    /**
     * @notice Removes liquidity from a pair
     * @dev Simplified version for testing
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        require(deadline >= block.timestamp, "MockRouter: expired");

        address pair = MockUniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "MockRouter: pair not found");

        // Transfer LP tokens to pair
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);

        // Burn and receive tokens
        (uint256 amount0, uint256 amount1) = MockUniswapV2Pair(pair).burn(to);

        // Sort amounts based on token order
        (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);

        require(amountA >= amountAMin, "MockRouter: insufficient A amount");
        require(amountB >= amountBMin, "MockRouter: insufficient B amount");
    }
}
