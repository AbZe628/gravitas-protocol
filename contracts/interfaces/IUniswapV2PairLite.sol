// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Minimal Uniswap V2 pair interface needed for manual burn/mint
interface IUniswapV2PairLite {
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function mint(address to) external returns (uint256 liquidity);
}
