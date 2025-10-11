// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
  Minimal Teleport contract for MVP demo.
  - Sadrži minimalne interface-e inline kako ne bi morao dirati node_modules ili druge fajlove.
  - Manual migration: burn LP on factoryA pair, mint on factoryB pair.
  - Simple owner pattern (no OZ imports) so deployment / calling je straightforward.
*/

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2PairLite {
    // minimal we need: burn and mint (pair is also ERC20 but we use IERC20 for transfer)
    function burn(address to) external returns (uint amount0, uint amount1);
    function mint(address to) external returns (uint liquidity);
}

contract Teleport {
    // --- owner ---
    address public owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Teleport: caller is not owner");
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

    // --- Events ---
    event LiquidityMigratedV2(
        address indexed caller,
        address indexed factoryFrom,
        address indexed factoryTo,
        address tokenA,
        address tokenB,
        uint amountA,
        uint amountB,
        uint liquidityMinted
    );

    // --- Helpers (admin) ---
    // Allow Teleport to set approve on LP pair (if needed)
    function approveLP(address pair, address spender, uint256 amount) external onlyOwner {
        IERC20(pair).approve(spender, 0);
        IERC20(pair).approve(spender, amount);
    }

    // Approve tokenA/tokenB allowance to a spender (e.g., routerB) from Teleport
    function approveTokens(address tokenA, address tokenB, address spender, uint256 amount) external onlyOwner {
        IERC20(tokenA).approve(spender, 0);
        IERC20(tokenA).approve(spender, amount);
        IERC20(tokenB).approve(spender, 0);
        IERC20(tokenB).approve(spender, amount);
    }

    // --------------------------
    // Manual migration A -> B
    // --------------------------
    // Steps:
    // 1) Find pairFrom via factoryFrom.getPair(tokenA, tokenB)
    // 2) Transfer LP (Teleport -> pairFrom) and call burn(to=Teleport) to get amountA/amountB
    // 3) Ensure pairTo exists on factoryTo (create if not)
    // 4) Transfer tokens (Teleport -> pairTo) and call mint(to=Teleport)
    // 5) Emit event
    //
    // All calls are performed by Teleport itself. No router used — deterministic.
    function migrateLiquidityV2Manual(
        address factoryFrom,
        address factoryTo,
        address tokenA,
        address tokenB,
        uint256 liquidity
    ) external onlyOwner {
        require(factoryFrom != address(0) && factoryTo != address(0), "Teleport: zero factory");
        require(tokenA != address(0) && tokenB != address(0), "Teleport: zero token");
        require(liquidity > 0, "Teleport: zero liquidity");

        // 1) Source pair
        address pairFrom = IUniswapV2Factory(factoryFrom).getPair(tokenA, tokenB);
        require(pairFrom != address(0), "Teleport: pairFrom not found");

        // 2) Move LP into pairFrom and burn to Teleport
        //   Note: pair is an ERC20 LP token so transfer works
        require(IERC20(pairFrom).transfer(pairFrom, liquidity), "Teleport: transfer LP -> pairFrom failed");

        (uint amountA, uint amountB) = IUniswapV2PairLite(pairFrom).burn(address(this));
        // amountA/amountB now belong to Teleport contract

        // 3) Ensure target pair exists (create if not)
        address pairTo = IUniswapV2Factory(factoryTo).getPair(tokenA, tokenB);
        if (pairTo == address(0)) {
            pairTo = IUniswapV2Factory(factoryTo).createPair(tokenA, tokenB);
            require(pairTo != address(0), "Teleport: createPair failed");
        }

        // 4) Transfer tokens to pairTo and mint LP to Teleport
        require(IERC20(tokenA).transfer(pairTo, amountA), "Teleport: transfer tokenA -> pairTo failed");
        require(IERC20(tokenB).transfer(pairTo, amountB), "Teleport: transfer tokenB -> pairTo failed");

        uint liquidityMinted = IUniswapV2PairLite(pairTo).mint(address(this));

        // 5) Emit event
        emit LiquidityMigratedV2(msg.sender, factoryFrom, factoryTo, tokenA, tokenB, amountA, amountB, liquidityMinted);
    }

}
