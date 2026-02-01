// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./GravitasPolicyRegistry.sol";

// --- External Interfaces ---
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

/**
 * @title TeleportV3 (Institutional Edition)
 * @notice The Deterministic Liquidity Routing Engine for atomic migration of Uniswap V3 NFT positions.
 */
contract TeleportV3 is ReentrancyGuard, Ownable, IERC721Receiver, EIP712 {
    using SafeERC20 for IERC20;

    // --- Immutable State ---
    INonfungiblePositionManager public immutable positionManager;
    ISwapRouter public immutable swapRouter;
    GravitasPolicyRegistry public immutable registry;

    // --- Signature Verification ---
    bytes32 private constant MIGRATION_TYPEHASH = keccak256(
        "MigrationIntent(uint256 tokenId,uint24 newFee,int24 newTickLower,int24 newTickUpper,uint256 deadline,uint256 nonce)"
    );
    mapping(address => uint256) public nonces;

    // --- Events ---
    event LiquidityTeleported(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        address indexed user,
        uint128 newLiquidity,
        uint24 newFee,
        bool swapExecuted
    );

    constructor(address _positionManager, address _swapRouter, address _registry) 
        Ownable(msg.sender) 
        EIP712("GravitasTeleportV3", "1") 
    {
        require(_positionManager != address(0), "TV3: Invalid PositionManager");
        require(_swapRouter != address(0), "TV3: Invalid SwapRouter");
        require(_registry != address(0), "TV3: Invalid Registry");
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
        registry = GravitasPolicyRegistry(_registry);
    }

    modifier onlyAuthorized() {
        require(registry.isExecutor(msg.sender) || msg.sender == owner(), "TV3: Not authorized executor");
        _;
    }

    struct AtomicMigrationParams {
        uint256 tokenId;
        uint24 newFee;
        int24 newTickLower;
        int24 newTickUpper;
        uint256 amount0MinMint;
        uint256 amount1MinMint;
        uint256 amount0MinDecrease;
        uint256 amount1MinDecrease;
        uint256 deadline;
        bool executeSwap;
        bool zeroForOne;
        uint256 swapAmountIn;
        uint256 swapAmountOutMin;
        uint24 swapFeeTier;
    }

    /**
     * @notice Executes atomic liquidity migration with intent verification.
     */
    function executeAtomicMigration(
        AtomicMigrationParams calldata params,
        bytes calldata signature
    ) 
        external 
        nonReentrant 
        onlyAuthorized 
        returns (uint256 newTokenId, uint128 newLiquidity) 
    {
        // 1. Parameter & Signature Validation
        require(params.deadline >= block.timestamp, "TV3: Deadline expired");
        require(_isValidFeeTier(params.newFee), "TV3: Invalid fee tier");
        require(params.newTickLower < params.newTickUpper, "TV3: Invalid ticks");
        
        // Tick spacing validation
        int24 spacing = _getTickSpacing(params.newFee);
        require(params.newTickLower % spacing == 0 && params.newTickUpper % spacing == 0, "TV3: Invalid tick spacing");
        require(params.amount0MinMint > 0 && params.amount1MinMint > 0, "TV3: Zero slippage not allowed");

        address owner = positionManager.ownerOf(params.tokenId);
        _verifyIntent(params, owner, signature);

        // 2. Position Data & Compliance
        (,, address token0, address token1, , , , uint128 liquidity, , , , ) = positionManager.positions(params.tokenId);
        require(liquidity > 0, "TV3: No liquidity");
        require(registry.areTokensCompliant(token0, token1), "TV3: Non-compliant assets");

        // 3. Execution
        uint256 balance0Start = IERC20(token0).balanceOf(address(this));
        uint256 balance1Start = IERC20(token1).balanceOf(address(this));

        positionManager.safeTransferFrom(owner, address(this), params.tokenId);
        
        positionManager.decreaseLiquidity(INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: params.tokenId,
            liquidity: liquidity,
            amount0Min: params.amount0MinDecrease,
            amount1Min: params.amount1MinDecrease,
            deadline: params.deadline
        }));

        (uint256 amount0Available, uint256 amount1Available) = positionManager.collect(INonfungiblePositionManager.CollectParams({
            tokenId: params.tokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
        
        positionManager.burn(params.tokenId);

        if (params.executeSwap && params.swapAmountIn > 0) {
            (amount0Available, amount1Available) = _executeRebalancingSwap(
                params, token0, token1, amount0Available, amount1Available
            );
        }

        (newTokenId, newLiquidity) = _mintNewPosition(
            params, token0, token1, amount0Available, amount1Available, owner
        );

        _refundDustSafe(token0, owner, balance0Start);
        _refundDustSafe(token1, owner, balance1Start);

        emit LiquidityTeleported(params.tokenId, newTokenId, owner, newLiquidity, params.newFee, params.executeSwap);
    }

    function _verifyIntent(AtomicMigrationParams calldata params, address owner, bytes calldata signature) internal {
        bytes32 structHash = keccak256(abi.encode(
            MIGRATION_TYPEHASH,
            params.tokenId,
            params.newFee,
            params.newTickLower,
            params.newTickUpper,
            params.deadline,
            nonces[owner]++
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        require(signer == owner, "TV3: Invalid signature");
    }

    function _isValidFeeTier(uint24 fee) internal pure returns (bool) {
        return (fee == 100 || fee == 500 || fee == 3000 || fee == 10000);
    }

    function _getTickSpacing(uint24 fee) internal pure returns (int24) {
        if (fee == 100) return 1;
        if (fee == 500) return 10;
        if (fee == 3000) return 60;
        if (fee == 10000) return 200;
        revert("TV3: Unsupported fee");
    }

    function _executeRebalancingSwap(
        AtomicMigrationParams calldata params, 
        address token0, 
        address token1,
        uint256 amount0Available,
        uint256 amount1Available
    ) private returns (uint256, uint256) {
        address tokenIn = params.zeroForOne ? token0 : token1;
        address tokenOut = params.zeroForOne ? token1 : token0;
        uint256 amountIn = params.swapAmountIn;

        require(amountIn <= (params.zeroForOne ? amount0Available : amount1Available), "TV3: Swap exceeds available");

        IERC20(tokenIn).forceApprove(address(swapRouter), amountIn);
        uint256 amountOut = swapRouter.exactInputSingle(ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: params.swapFeeTier,
            recipient: address(this),
            deadline: params.deadline,
            amountIn: amountIn,
            amountOutMinimum: params.swapAmountOutMin,
            sqrtPriceLimitX96: 0
        }));

        return params.zeroForOne 
            ? (amount0Available - amountIn, amount1Available + amountOut)
            : (amount0Available + amountOut, amount1Available - amountIn);
    }

    function _mintNewPosition(
        AtomicMigrationParams calldata params, 
        address token0, 
        address token1,
        uint256 amount0Budget,
        uint256 amount1Budget,
        address recipient
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
            recipient: recipient,
            deadline: params.deadline
        }));
    }

    function _refundDustSafe(address token, address recipient, uint256 balanceBefore) private {
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        if (balanceAfter > balanceBefore) {
            uint256 dust = balanceAfter - balanceBefore;
            IERC20(token).safeTransfer(recipient, dust);
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
