// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MockUniswapV2Pair.sol";

/**
 * @title MockUniswapV2Factory
 * @notice Minimal deterministic mock for Uniswap V2 Factory testing
 * @dev Used for testing only - not for production deployment
 */
contract MockUniswapV2Factory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    /**
     * @notice Creates a new mock pair for two tokens
     * @dev Ensures token0 < token1 for consistency
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "MockFactory: identical addresses");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "MockFactory: zero address");
        require(getPair[token0][token1] == address(0), "MockFactory: pair exists");

        MockUniswapV2Pair newPair = new MockUniswapV2Pair(token0, token1);
        pair = address(newPair);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}
