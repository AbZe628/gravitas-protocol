// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    function addLiquidity(
        address tokenA, address tokenB,
        uint amountADesired, uint amountBDesired,
        uint amountAMin, uint amountBMin,
        address to, uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function removeLiquidity(
        address tokenA, address tokenB,
        uint liquidity,
        uint amountAMin, uint amountBMin,
        address to, uint deadline
    ) external returns (uint amountA, uint amountB);
}
