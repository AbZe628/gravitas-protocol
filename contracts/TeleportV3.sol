// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GravitasPolicyRegistry.sol";

// --- Interfaces ---
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
    function burn(uint256 tokenId) external payable;
    function ownerOf(uint256 tokenId) external view returns (address);
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
// --- End Interfaces ---

/**
 * @title TeleportV3 (Institutional Edition)
 * @notice The core V3 engine for atomic migration of Uniswap V3 NFT liquidity positions.
 * @dev Optimized with Yul (Inline Assembly) for hot-path gas efficiency.
 */
contract TeleportV3 is ReentrancyGuard, Ownable, IERC721Receiver {
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable positionManager;
    ISwapRouter public immutable swapRouter;
    GravitasPolicyRegistry public immutable registry;

    event LiquidityTeleported(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        address indexed user,
        uint128 newLiquidity,
        uint24 newFee,
        bool swapped
    );

    constructor(address _positionManager, address _swapRouter, address _registry) Ownable(msg.sender) {
        require(_positionManager != address(0), "TV3: Invalid Manager");
        require(_swapRouter != address(0), "TV3: Invalid Router");
        require(_registry != address(0), "TV3: Invalid Registry");
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
        registry = GravitasPolicyRegistry(_registry);
    }

    modifier onlyAuthorized() {
        require(registry.isExecutor(msg.sender) || msg.sender == owner(), "TV3: Not authorized");
        _;
    }

    struct TeleportParams {
        uint256 tokenId;
        uint24 newFee;
        int24 newTickLower;
        int24 newTickUpper;
        uint256 amount0MinMint;
        uint256 amount1MinMint;
        uint256 amount0MinDecrease;
        uint256 amount1MinDecrease;
        uint256 deadline;
        bool doSwap;
        bool zeroForOne;
        uint256 amountToSwap;
        uint256 amountOutSwapMin;
        uint24 swapFee;
    }

    /**
     * @notice Executes an atomic migration of a Uniswap V3 position to a new fee tier or tick range.
     * @dev Handles the full lifecycle: Burn -> Collect -> (Optional Swap) -> Mint -> Refund.
     * @param params The migration parameters including slippage and swap details.
     * @return newTokenId The ID of the newly minted Uniswap V3 position NFT.
     * @return newLiquidity The amount of liquidity in the new position.
     */
    function teleportLiquidity(TeleportParams calldata params) 
        external 
        nonReentrant 
        onlyAuthorized 
        returns (uint256 newTokenId, uint128 newLiquidity) 
    {
        require(params.deadline >= block.timestamp, "TV3: Deadline passed");
        
        (,, address token0, address token1, , , , uint128 liquidity, , , , ) = positionManager.positions(params.tokenId);
        require(liquidity > 0, "TV3: No liquidity");
        require(registry.areTokensCompliant(token0, token1), "TV3: Non-compliant assets");
        require(positionManager.ownerOf(params.tokenId) == msg.sender, "TV3: Not NFT owner");

        uint256 balance0Start = IERC20(token0).balanceOf(address(this));
        uint256 balance1Start = IERC20(token1).balanceOf(address(this));

        positionManager.safeTransferFrom(msg.sender, address(this), params.tokenId);
        positionManager.decreaseLiquidity(INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: params.tokenId,
            liquidity: liquidity,
            amount0Min: params.amount0MinDecrease,
            amount1Min: params.amount1MinDecrease,
            deadline: params.deadline
        }));

        (uint256 amount0Avail, uint256 amount1Avail) = positionManager.collect(INonfungiblePositionManager.CollectParams({
            tokenId: params.tokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
        positionManager.burn(params.tokenId);

        if (params.doSwap && params.amountToSwap > 0) {
            (amount0Avail, amount1Avail) = _performSwap(params, token0, token1, amount0Avail, amount1Avail);
        }

        (newTokenId, newLiquidity) = _mintNew(params, token0, token1, amount0Avail, amount1Avail);

        // Hot Path: Dust Refund with Yul Optimization
        _refundDeltaYul(token0, msg.sender, balance0Start);
        _refundDeltaYul(token1, msg.sender, balance1Start);

        emit LiquidityTeleported(params.tokenId, newTokenId, msg.sender, newLiquidity, params.newFee, params.doSwap);
    }

    function _performSwap(
        TeleportParams calldata params, 
        address token0, 
        address token1,
        uint256 amount0Avail,
        uint256 amount1Avail
    ) private returns (uint256, uint256) {
        address tokenIn = params.zeroForOne ? token0 : token1;
        address tokenOut = params.zeroForOne ? token1 : token0;
        uint256 amountIn = params.amountToSwap;

        require(amountIn <= (params.zeroForOne ? amount0Avail : amount1Avail), "TV3: Swap > Avail");

        IERC20(tokenIn).forceApprove(address(swapRouter), amountIn);
        uint256 amountOut = swapRouter.exactInputSingle(ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: params.swapFee,
            recipient: address(this),
            deadline: params.deadline,
            amountIn: amountIn,
            amountOutMinimum: params.amountOutSwapMin,
            sqrtPriceLimitX96: 0
        }));

        return params.zeroForOne 
            ? (amount0Avail - amountIn, amount1Avail + amountOut)
            : (amount0Avail + amountOut, amount1Avail - amountIn);
    }

    function _mintNew(
        TeleportParams calldata params, 
        address token0, 
        address token1,
        uint256 amount0Budget,
        uint256 amount1Budget
    ) private returns (uint256 tokenId, uint128 liquidity) {
        IERC20(token0).forceApprove(address(positionManager), amount0Budget);
        IERC20(token1).forceApprove(address(positionManager), amount1Budget);

        (tokenId, liquidity, , ) = positionManager.mint(INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: params.newFee,
            tickLower: params.newTickLower,
            tickUpper: params.newTickUpper,
            amount0Desired: amount0Budget,
            amount1Desired: amount1Budget,
            amount0Min: params.amount0MinMint,
            amount1Min: params.amount1MinMint,
            recipient: msg.sender,
            deadline: params.deadline
        }));
    }

    /**
     * @notice Optimized dust refund using Yul (Inline Assembly).
     * @dev This function saves ~2,000 gas per call by bypassing Solidity's high-level checks
     *      and using direct memory manipulation for the transfer call.
     *      Shariah Compliance: Ensures no funds are trapped (Gharar avoidance).
     * @param tokenAddress The address of the token to refund.
     * @param recipientAddress The address to send the dust to.
     * @param balanceBefore The balance of the token before the migration.
     */
    function _refundDeltaYul(address tokenAddress, address recipientAddress, uint256 balanceBefore) private {
        // Edge Case: Ensure recipient is not zero address
        if (recipientAddress == address(0)) return;

        uint256 balanceAfter = IERC20(tokenAddress).balanceOf(address(this));
        
        if (balanceAfter > balanceBefore) {
            uint256 delta;
            unchecked { delta = balanceAfter - balanceBefore; }
            
            // Yul-optimized transfer call
            assembly {
                // ERC20 transfer(address,uint256) selector: 0xa9059cbb
                let ptr := mload(0x40)
                mstore(ptr, 0xa9059cbb00000000000000000000000000000000000000000000000000000000)
                mstore(add(ptr, 0x04), and(recipientAddress, 0xffffffffffffffffffffffffffffffffffffffff))
                mstore(add(ptr, 0x24), delta)

                // Execute call and check success
                let success := call(gas(), tokenAddress, 0, ptr, 0x44, ptr, 0x20)
                
                // If call failed, or if it returned data and that data is false (0)
                let returnedFalse := and(gt(returndatasize(), 0), iszero(mload(ptr)))
                if or(iszero(success), returnedFalse) {
                    revert(0, 0)
                }
            }
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
