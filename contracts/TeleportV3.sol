// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// --- UNISWAP V3 INTERFACES ---

interface INonfungiblePositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }
    function positions(uint256 tokenId) external view returns (
        uint96 nonce, address operator, address token0, address token1, uint24 fee,
        int24 tickLower, int24 tickUpper, uint128 liquidity,
        uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0, uint128 tokensOwed1
    );
    function decreaseLiquidity(DecreaseLiquidityParams calldata params) external payable returns (uint256 amount0, uint256 amount1);
    function collect(CollectParams calldata params) external payable returns (uint256 amount0, uint256 amount1);
    function mint(MintParams calldata params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title TeleportV3 (Auto-Swap Edition)
 * @dev Handles atomic migration of Uniswap V3 Positions INCLUDING automatic ratio rebalancing (swaps).
 */
contract TeleportV3 is ReentrancyGuard, Ownable, IERC721Receiver {
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable positionManager;
    ISwapRouter public immutable swapRouter;

    event LiquidityTeleportedV3(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        address user,
        uint128 newLiquidity,
        bool swapped
    );

    constructor(address _positionManager, address _swapRouter) Ownable(msg.sender) {
        require(_positionManager != address(0), "Invalid Manager");
        require(_swapRouter != address(0), "Invalid Router");
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
    }

    struct TeleportParams {
        uint256 tokenId;        // Old NFT ID
        uint24 newFee;          // Target Fee Tier (e.g. 3000)
        int24 newTickLower;     // Target Lower Tick
        int24 newTickUpper;     // Target Upper Tick
        uint256 amount0Min;     // Slippage for mint
        uint256 amount1Min;     // Slippage for mint
        uint256 deadline;
        
        // --- AUTO-SWAP PARAMS ---
        bool doSwap;            // Set to true if rebalancing is needed
        bool zeroForOne;        // true = swap Token0 -> Token1, false = Token1 -> Token0
        uint256 amountToSwap;   // How much to swap to fix the ratio
        uint256 amountOutSwapMin; // Minimum received from swap (slippage)
    }

    function teleportLiquidityV3(TeleportParams calldata params) 
        external 
        nonReentrant 
        returns (uint256 newTokenId, uint128 newLiquidity) 
    {
        require(params.deadline >= block.timestamp, "Deadline passed");

        // 1. Fetch Position Info
        (,, address token0, address token1, , , , uint128 liquidity, , , , ) = 
            positionManager.positions(params.tokenId);
        require(liquidity > 0, "No liquidity");

        // 2. Transfer NFT & Burn Logic
        positionManager.safeTransferFrom(msg.sender, address(this), params.tokenId);

        positionManager.decreaseLiquidity(INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: params.tokenId,
            liquidity: liquidity,
            amount0Min: 0, 
            amount1Min: 0,
            deadline: params.deadline
        }));

        (uint256 amount0, uint256 amount1) = positionManager.collect(INonfungiblePositionManager.CollectParams({
            tokenId: params.tokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));

        // 3. AUTO-SWAP LOGIC (The new magic part)
        if (params.doSwap && params.amountToSwap > 0) {
            address tokenIn = params.zeroForOne ? token0 : token1;
            address tokenOut = params.zeroForOne ? token1 : token0;

            // Approve Router
            IERC20(tokenIn).forceApprove(address(swapRouter), params.amountToSwap);

            ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: params.newFee, // Use same fee tier for swap usually
                recipient: address(this),
                deadline: params.deadline,
                amountIn: params.amountToSwap,
                amountOutMinimum: params.amountOutSwapMin,
                sqrtPriceLimitX96: 0
            });

            swapRouter.exactInputSingle(swapParams);

            // Update balances after swap
            amount0 = IERC20(token0).balanceOf(address(this));
            amount1 = IERC20(token1).balanceOf(address(this));
        }

        // 4. Approve & Mint New Position
        IERC20(token0).forceApprove(address(positionManager), amount0);
        IERC20(token1).forceApprove(address(positionManager), amount1);

        (newTokenId, newLiquidity, , ) = positionManager.mint(INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: params.newFee,
            tickLower: params.newTickLower,
            tickUpper: params.newTickUpper,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: params.amount0Min,
            amount1Min: params.amount1Min,
            recipient: msg.sender,
            deadline: params.deadline
        }));

        // 5. Cleanup
        _refundDust(token0, msg.sender);
        _refundDust(token1, msg.sender);
        
        // Return empty shell NFT
        positionManager.safeTransferFrom(address(this), msg.sender, params.tokenId);

        emit LiquidityTeleportedV3(params.tokenId, newTokenId, msg.sender, newLiquidity, params.doSwap);
    }

    function _refundDust(address token, address to) private {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) IERC20(token).safeTransfer(to, balance);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
