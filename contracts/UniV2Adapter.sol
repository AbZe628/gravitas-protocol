// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract UniV2Adapter {
    using SafeERC20 for IERC20;

    function getPair(address router, address tokenA, address tokenB) public view returns (address) {
        address factory = IUniswapV2Router02(router).factory();
        return IUniswapV2Factory(factory).getPair(tokenA, tokenB);
    }

    /// @notice Remove all specified LP amount and keep tokens A/B in this adapter
    function removeLiquidityAll(
        address router,
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        IERC20 lp = IERC20(getPair(router, tokenA, tokenB));

        // OZ v5: use forceApprove instead of (safe)approve
        lp.forceApprove(router, 0);
        lp.forceApprove(router, liquidity);

        (amountA, amountB) = IUniswapV2Router02(router)
            .removeLiquidity(
                tokenA,
                tokenB,
                liquidity,
                amountAMin,
                amountBMin,
                address(this), // tokens are held in this adapter
                deadline
            );
    }

    /// @notice Add collected tokens as liquidity and mint LP to recipient `to`
    function addLiquidityAll(
        address router,
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        IERC20(tokenA).forceApprove(router, 0);
        IERC20(tokenA).forceApprove(router, amountADesired);
        IERC20(tokenB).forceApprove(router, 0);
        IERC20(tokenB).forceApprove(router, amountBDesired);

        (amountA, amountB, liquidity) = IUniswapV2Router02(router)
            .addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline);
    }
}
