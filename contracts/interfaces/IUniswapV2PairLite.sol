// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Minimalni Uniswap V2 pair interface koji nam treba za manual burn/mint
interface IUniswapV2PairLite {
    function burn(address to) external returns (uint amount0, uint amount1);
    function mint(address to) external returns (uint liquidity);
}
