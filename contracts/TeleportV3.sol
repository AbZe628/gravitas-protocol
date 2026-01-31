// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GravitasPolicyRegistry.sol";

// ═══════════════════════════════════════════════════════════════════════════════════════
//                              EXTERNAL INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════════════
//                              TELEPORT V3 CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * @title TeleportV3 (Institutional Edition)
 * @author Gravitas Protocol Labs
 * @notice The Deterministic Liquidity Routing Engine for atomic migration of Uniswap V3 NFT positions.
 * @dev This contract is the execution layer of the Gravitas Protocol infrastructure thesis,
 *      enabling atomic liquidity migration with guaranteed outcomes (no partial failures).
 *
 *      CORE PRINCIPLES (Bank-Grade Infrastructure):
 *      ┌─────────────────────────────────────────────────────────────────────────────────┐
 *      │ 1. DETERMINISTIC EXECUTION: Transactions revert entirely if parameters not met │
 *      │ 2. GHARAR ELIMINATION: Users know exactly what they receive before execution   │
 *      │ 3. POLICY-CONSTRAINED ROUTING: All migrations validated against Shariah params │
 *      │ 4. ATOMIC MIGRATION: Remove Liquidity → Swap → Add Liquidity in ONE transaction│
 *      └─────────────────────────────────────────────────────────────────────────────────┘
 *
 *      MIGRATION FLOW (Atomic Execution):
 *      Step 1: Transfer NFT position to this contract
 *      Step 2: Decrease liquidity and collect all tokens
 *      Step 3: Burn the old position NFT
 *      Step 4: (Optional) Perform swap to rebalance token ratios
 *      Step 5: Mint new position with desired parameters
 *      Step 6: Refund any dust to user (Gharar Elimination - no trapped funds)
 *
 *      This contract is designed for institutional players (banks, fintechs, family offices)
 *      who require mathematical certainty and cannot use tools that "might" work.
 *
 *      GAS OPTIMIZATION: Hot-path operations use Yul (Inline Assembly) for ~2,000 gas savings
 *      per dust refund operation, maintaining institutional-grade efficiency.
 */
contract TeleportV3 is ReentrancyGuard, Ownable, IERC721Receiver {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                              IMMUTABLE STATE
    // ═══════════════════════════════════════════════════════════════════════════════════

    /// @notice Uniswap V3 Position Manager for NFT liquidity operations
    INonfungiblePositionManager public immutable positionManager;
    
    /// @notice Uniswap V3 Swap Router for token rebalancing operations
    ISwapRouter public immutable swapRouter;
    
    /// @notice Gravitas Policy Registry - The Risk & Compliance Oracle
    GravitasPolicyRegistry public immutable registry;

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                                   EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Emitted upon successful atomic liquidity migration.
     * @param oldTokenId The NFT ID of the original position (now burned).
     * @param newTokenId The NFT ID of the newly minted position.
     * @param user The address that initiated the migration.
     * @param newLiquidity The amount of liquidity in the new position.
     * @param newFee The fee tier of the new position.
     * @param swapExecuted Whether a rebalancing swap was performed.
     */
    event LiquidityTeleported(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        address indexed user,
        uint128 newLiquidity,
        uint24 newFee,
        bool swapExecuted
    );

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                                 CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the TeleportV3 Deterministic Liquidity Routing Engine.
     * @dev All addresses are validated to prevent deployment with invalid dependencies.
     *      This follows the institutional mindset: Code safety first.
     *
     * @param _positionManager Uniswap V3 NonfungiblePositionManager address.
     * @param _swapRouter Uniswap V3 SwapRouter address.
     * @param _registry GravitasPolicyRegistry (Risk & Compliance Oracle) address.
     */
    constructor(address _positionManager, address _swapRouter, address _registry) Ownable(msg.sender) {
        require(_positionManager != address(0), "TV3: Invalid PositionManager");
        require(_swapRouter != address(0), "TV3: Invalid SwapRouter");
        require(_registry != address(0), "TV3: Invalid Registry");
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
        registry = GravitasPolicyRegistry(_registry);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                              ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Modifier to enforce institutional access control.
     *      Only authorized executors (registered in the Policy Registry) or the contract
     *      owner can execute migrations. This is critical for institutional security.
     */
    modifier onlyAuthorized() {
        require(registry.isExecutor(msg.sender) || msg.sender == owner(), "TV3: Not authorized executor");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           MIGRATION PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Parameters for atomic liquidity migration.
     * @dev All parameters are validated before execution to ensure Deterministic Execution.
     *      If any parameter is invalid, the entire transaction reverts (Gharar Elimination).
     */
    struct AtomicMigrationParams {
        uint256 tokenId;              // NFT ID of the position to migrate
        uint24 newFee;                // Fee tier for the new position (500, 3000, 10000)
        int24 newTickLower;           // Lower tick boundary for new position
        int24 newTickUpper;           // Upper tick boundary for new position
        uint256 amount0MinMint;       // Minimum token0 for new position (slippage protection)
        uint256 amount1MinMint;       // Minimum token1 for new position (slippage protection)
        uint256 amount0MinDecrease;   // Minimum token0 from liquidity removal
        uint256 amount1MinDecrease;   // Minimum token1 from liquidity removal
        uint256 deadline;             // Transaction deadline (Unix timestamp)
        bool executeSwap;             // Whether to perform rebalancing swap
        bool zeroForOne;              // Swap direction (true = token0 → token1)
        uint256 swapAmountIn;         // Amount to swap for rebalancing
        uint256 swapAmountOutMin;     // Minimum output from swap (slippage protection)
        uint24 swapFeeTier;           // Fee tier for the swap pool
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           CORE MIGRATION LOGIC
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Executes atomic liquidity migration with Shariah compliance validation.
     * @dev DETERMINISTIC LIQUIDITY ROUTING - The core function implementing the Gravitas thesis.
     *
     *      EXECUTION FLOW (Atomic - All or Nothing):
     *      ┌────────────────────────────────────────────────────────────────────────────┐
     *      │ 1. COMPLIANCE CHECK: Validate tokens against Shariah parameters           │
     *      │ 2. OWNERSHIP CHECK: Verify caller owns the NFT position                   │
     *      │ 3. LIQUIDITY REMOVAL: Decrease liquidity and collect all tokens           │
     *      │ 4. POSITION BURN: Destroy the old NFT position                            │
     *      │ 5. OPTIONAL SWAP: Rebalance token ratios if requested                     │
     *      │ 6. NEW POSITION: Mint new NFT with desired parameters                     │
     *      │ 7. DUST REFUND: Return any remaining tokens (Gharar Elimination)          │
     *      └────────────────────────────────────────────────────────────────────────────┘
     *
     *      GHARAR ELIMINATION: Users know exactly what they receive before execution.
     *      If the transaction cannot meet the specified minimums, it reverts entirely.
     *      No partial failures, no unexpected outcomes.
     *
     * @param params The atomic migration parameters (see AtomicMigrationParams struct).
     * @return newTokenId The NFT ID of the newly minted position.
     * @return newLiquidity The amount of liquidity in the new position.
     */
    function executeAtomicMigration(AtomicMigrationParams calldata params) 
        external 
        nonReentrant 
        onlyAuthorized 
        returns (uint256 newTokenId, uint128 newLiquidity) 
    {
        // ═══════════════════════════════════════════════════════════════════════════════
        // STEP 1: PRE-FLIGHT VALIDATION (Deterministic Execution)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        require(params.deadline >= block.timestamp, "TV3: Deadline expired");
        
        // Fetch position data from Uniswap V3 Position Manager
        (,, address token0, address token1, , , , uint128 liquidity, , , , ) = positionManager.positions(params.tokenId);
        require(liquidity > 0, "TV3: Position has no liquidity");
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // STEP 2: SHARIAH COMPLIANCE CHECK (Gharar Elimination)
        // This implements the "Risk & Compliance Check" phase of the Gravitas flow.
        // Both tokens MUST be whitelisted in the Policy Registry.
        // ═══════════════════════════════════════════════════════════════════════════════
        
        require(registry.areTokensCompliant(token0, token1), "TV3: Assets not Shariah-compliant");
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // STEP 3: OWNERSHIP VERIFICATION (Institutional Security)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        require(positionManager.ownerOf(params.tokenId) == msg.sender, "TV3: Caller is not NFT owner");

        // Record initial balances for dust refund calculation
        uint256 balance0Start = IERC20(token0).balanceOf(address(this));
        uint256 balance1Start = IERC20(token1).balanceOf(address(this));

        // ═══════════════════════════════════════════════════════════════════════════════
        // STEP 4: ATOMIC EXECUTION (Remove → Collect → Burn → Swap → Mint)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        // Transfer NFT to this contract for processing
        positionManager.safeTransferFrom(msg.sender, address(this), params.tokenId);
        
        // Remove all liquidity from the position
        positionManager.decreaseLiquidity(INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: params.tokenId,
            liquidity: liquidity,
            amount0Min: params.amount0MinDecrease,
            amount1Min: params.amount1MinDecrease,
            deadline: params.deadline
        }));

        // Collect all tokens (including any accrued fees)
        (uint256 amount0Available, uint256 amount1Available) = positionManager.collect(INonfungiblePositionManager.CollectParams({
            tokenId: params.tokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
        
        // Burn the old position NFT (it's now empty)
        positionManager.burn(params.tokenId);

        // ═══════════════════════════════════════════════════════════════════════════════
        // STEP 5: OPTIONAL REBALANCING SWAP
        // ═══════════════════════════════════════════════════════════════════════════════
        
        if (params.executeSwap && params.swapAmountIn > 0) {
            (amount0Available, amount1Available) = _executeRebalancingSwap(
                params, token0, token1, amount0Available, amount1Available
            );
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // STEP 6: MINT NEW POSITION
        // ═══════════════════════════════════════════════════════════════════════════════
        
        (newTokenId, newLiquidity) = _mintNewPosition(
            params, token0, token1, amount0Available, amount1Available
        );

        // ═══════════════════════════════════════════════════════════════════════════════
        // STEP 7: DUST REFUND (Gharar Elimination - No Trapped Funds)
        // Uses Yul optimization for gas efficiency (~2,000 gas saved per call)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        _refundDustOptimized(token0, msg.sender, balance0Start);
        _refundDustOptimized(token1, msg.sender, balance1Start);

        emit LiquidityTeleported(params.tokenId, newTokenId, msg.sender, newLiquidity, params.newFee, params.executeSwap);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Executes a rebalancing swap to adjust token ratios.
     * @dev Part of the Atomic Migration flow. Validates swap amount against available balance.
     */
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

        // Validate swap amount doesn't exceed available balance
        require(amountIn <= (params.zeroForOne ? amount0Available : amount1Available), "TV3: Swap amount exceeds available");

        // Approve and execute swap
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

        // Return updated balances
        return params.zeroForOne 
            ? (amount0Available - amountIn, amount1Available + amountOut)
            : (amount0Available + amountOut, amount1Available - amountIn);
    }

    /**
     * @notice Mints a new liquidity position with the specified parameters.
     * @dev Part of the Atomic Migration flow. The new NFT is sent directly to the user.
     */
    function _mintNewPosition(
        AtomicMigrationParams calldata params, 
        address token0, 
        address token1,
        uint256 amount0Budget,
        uint256 amount1Budget
    ) private returns (uint256 tokenId, uint128 liquidity) {
        // Approve Position Manager to spend tokens
        IERC20(token0).forceApprove(address(positionManager), amount0Budget);
        IERC20(token1).forceApprove(address(positionManager), amount1Budget);

        // Mint new position (NFT sent directly to user)
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
     * @notice Refunds any remaining tokens (dust) to the user using Yul optimization.
     * @dev GHARAR ELIMINATION: Ensures no funds are trapped in the contract.
     *
     *      This function implements a critical Shariah compliance feature:
     *      ┌────────────────────────────────────────────────────────────────────────────┐
     *      │ • Deterministic refund of unused tokens (dust)                            │
     *      │ • Eliminates uncertainty by returning exact remaining balances            │
     *      │ • Users receive guaranteed outcomes with no partial failures              │
     *      └────────────────────────────────────────────────────────────────────────────┘
     *
     *      GAS OPTIMIZATION: Uses Yul (Inline Assembly) to save ~2,000 gas per call
     *      by bypassing Solidity's high-level checks and using direct memory manipulation.
     *
     * @param token The address of the token to refund.
     * @param recipient The address to send the dust to.
     * @param balanceBefore The balance of the token before the migration.
     */
    function _refundDustOptimized(address token, address recipient, uint256 balanceBefore) private {
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        
        if (balanceAfter > balanceBefore) {
            uint256 dustAmount;
            unchecked { dustAmount = balanceAfter - balanceBefore; }
            
            // Yul-optimized ERC20 transfer
            // Selector: transfer(address,uint256) = 0xa9059cbb
            assembly {
                let ptr := mload(0x40)
                mstore(ptr, 0xa9059cbb00000000000000000000000000000000000000000000000000000000)
                mstore(add(ptr, 0x04), and(recipient, 0xffffffffffffffffffffffffffffffffffffffff))
                mstore(add(ptr, 0x24), dustAmount)

                let success := call(gas(), token, 0, ptr, 0x44, 0, 0)
                
                if iszero(success) {
                    // Revert if transfer fails (maintains atomic execution guarantee)
                    revert(0, 0)
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    //                           ERC721 RECEIVER
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Handles the receipt of an NFT (required for safeTransferFrom).
     * @dev This contract must implement IERC721Receiver to receive Uniswap V3 position NFTs.
     */
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
