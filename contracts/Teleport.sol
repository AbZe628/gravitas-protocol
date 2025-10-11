// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IUniswapV2Pair.sol";
import "./UniV2Adapter.sol";

contract Teleport is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    UniV2Adapter public adapter;

    event LiquidityMigratedV2(
        address indexed user,
        address indexed routerFrom,
        address indexed routerTo,
        address tokenA,
        address tokenB,
        uint256 amountAOut,
        uint256 amountBOut,
        uint256 liquidityMinted
    );

    // OZ v5: Ownable traži inicijalnog vlasnika
    constructor(address _adapter) Ownable(msg.sender) {
        adapter = UniV2Adapter(_adapter);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice MVP: migrira LP sa V2 routera na V2 router (može biti isti router i za demo)
    function migrateLiquidityV2(
        address routerFrom,
        address routerTo,
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 removeAMin,
        uint256 removeBMin,
        uint256 addAMin,
        uint256 addBMin,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        // 1) Dohvati LP adresu za routerFrom
        address lp = adapter.getPair(routerFrom, tokenA, tokenB);
        require(lp != address(0), "Pair not found");

        // 2) Povuci LP od korisnika u ADAPTER (on ce obaviti removeLiquidity)
        IUniswapV2Pair(lp).transferFrom(msg.sender, address(adapter), liquidity);

        // 3) Ukloni likvidnost preko adaptera (tokeni A/B ostaju u adapteru)
        (uint256 amtA, uint256 amtB) = adapter.removeLiquidityAll(
            routerFrom, tokenA, tokenB, liquidity, removeAMin, removeBMin, deadline
        );

        // 4) Prebaci tokene iz adaptera u ovaj contract (Teleport)
        IERC20(tokenA).safeTransferFrom(address(adapter), address(this), amtA);
        IERC20(tokenB).safeTransferFrom(address(adapter), address(this), amtB);

        // 5) Odobri adapteru pa dodaj likvidnost na routerTo, LP ide korisniku
        IERC20(tokenA).forceApprove(address(adapter), 0);
        IERC20(tokenA).forceApprove(address(adapter), amtA);
        IERC20(tokenB).forceApprove(address(adapter), 0);
        IERC20(tokenB).forceApprove(address(adapter), amtB);

        (uint256 a2, uint256 b2, uint256 liq) = adapter.addLiquidityAll(
            routerTo, tokenA, tokenB, amtA, amtB, addAMin, addBMin, msg.sender, deadline
        );

        emit LiquidityMigratedV2(msg.sender, routerFrom, routerTo, tokenA, tokenB, a2, b2, liq);
    }
}
