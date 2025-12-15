// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Uniswap V3 Interfaces
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

    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function collect(CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function mint(MintParams calldata params)
        external
        payable
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

/**
 * @title TeleportV3
 * @dev Handles atomic migration of Uniswap V3 Liquidity Positions (NFTs).
 * Compatible with Arbitrum One (Uniswap V3, Camelot V3).
 */
contract TeleportV3 is ReentrancyGuard, Ownable, IERC721Receiver {
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable positionManager;

    event LiquidityTeleportedV3(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        address user,
        address token0,
        address token1,
        uint24 newFee,
        uint128 newLiquidity
    );

    constructor(address _positionManager) Ownable(msg.sender) {
        require(_positionManager != address(0), "Invalid Manager");
        positionManager = INonfungiblePositionManager(_positionManager);
    }

    struct TeleportParams {
        uint256 tokenId;        // The NFT ID of the user's current position
        uint24 newFee;          // Target Fee Tier (e.g. 500, 3000, 10000)
        int24 newTickLower;     // Target Lower Tick
        int24 newTickUpper;     // Target Upper Tick
        uint256 amount0Min;     // Slippage protection for creating new pos
        uint256 amount1Min;     // Slippage protection for creating new pos
        uint256 deadline;
    }

    /**
     * @notice Migrates a Uniswap V3 NFT position to a new Fee Tier or Tick Range atomicaly.
     * @dev User must approve this contract on the NonfungiblePositionManager before calling.
     */
    function teleportLiquidityV3(TeleportParams calldata params) 
        external 
        nonReentrant 
        returns (uint256 newTokenId, uint128 newLiquidity) 
    {
        require(params.deadline >= block.timestamp, "Deadline passed");

        // 1. Fetch Position Info to verify ownership and tokens
        (,, address token0, address token1, , , , uint128 liquidity, , , , ) = 
            positionManager.positions(params.tokenId);
        
        require(liquidity > 0, "No liquidity in position");

        // 2. Transfer NFT from User -> Contract
        // NOTE: User must setApprovalForAll or approve this contract for the tokenId first
        positionManager.safeTransferFrom(msg.sender, address(this), params.tokenId);

        // 3. Remove Liquidity (Burn) - Keep tokens in contract
        INonfungiblePositionManager.DecreaseLiquidityParams memory decreaseParams =
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: params.tokenId,
                liquidity: liquidity,
                amount0Min: 0, // We check slippage at Mint stage or explicit check
                amount1Min: 0,
                deadline: params.deadline
            });
        
        positionManager.decreaseLiquidity(decreaseParams);

        // 4. Collect Tokens (Principal + Fees) from the position
        INonfungiblePositionManager.CollectParams memory collectParams =
            INonfungiblePositionManager.CollectParams({
                tokenId: params.tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (uint256 amount0Collected, uint256 amount1Collected) = 
            positionManager.collect(collectParams);

        // 5. Approve Manager to spend tokens for the new position
        IERC20(token0).forceApprove(address(positionManager), amount0Collected);
        IERC20(token1).forceApprove(address(positionManager), amount1Collected);

        // 6. Mint NEW Position (Teleport to new params)
        INonfungiblePositionManager.MintParams memory mintParams =
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: params.newFee,
                tickLower: params.newTickLower,
                tickUpper: params.newTickUpper,
                amount0Desired: amount0Collected,
                amount1Desired: amount1Collected,
                amount0Min: params.amount0Min,
                amount1Min: params.amount1Min,
                recipient: msg.sender, // Send new NFT directly to user
                deadline: params.deadline
            });

        (newTokenId, newLiquidity, , ) = positionManager.mint(mintParams);

        // 7. Refund Dust (tokens not used in Mint)
        _refundDust(token0, msg.sender);
        _refundDust(token1, msg.sender);

        // 8. Return the OLD empty NFT shell to the user (optional, but clean)
        positionManager.safeTransferFrom(address(this), msg.sender, params.tokenId);

        emit LiquidityTeleportedV3(
            params.tokenId, 
            newTokenId, 
            msg.sender, 
            token0, 
            token1, 
            params.newFee, 
            newLiquidity
        );
    }

    function _refundDust(address token, address to) private {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
        }
    }

    // Required for receiving ERC721 tokens (Uniswap V3 NFTs)
    function onERC721Received(
        address, 
        address, 
        uint256, 
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
