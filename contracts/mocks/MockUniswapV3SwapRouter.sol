// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockUniswapV3SwapRouter
 * @notice Minimal deterministic mock for Uniswap V3 Swap Router testing
 * @dev Used for testing only - not for production deployment
 * @dev Simulates swaps with a simple 1:1 ratio for deterministic testing
 */
contract MockUniswapV3SwapRouter {
    using SafeERC20 for IERC20;

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

    // Configurable swap ratio (default 1:1, can be set for testing)
    mapping(address => mapping(address => uint256)) public swapRatios; // tokenIn => tokenOut => ratio (in basis points, 10000 = 1:1)
    uint256 public constant DEFAULT_RATIO = 10000; // 1:1 ratio

    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient
    );

    /**
     * @notice Sets a custom swap ratio for testing
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param ratioBps Ratio in basis points (10000 = 1:1, 9000 = 0.9:1)
     */
    function setSwapRatio(address tokenIn, address tokenOut, uint256 ratioBps) external {
        require(ratioBps > 0 && ratioBps <= 20000, "MockRouter: invalid ratio");
        swapRatios[tokenIn][tokenOut] = ratioBps;
    }

    /**
     * @notice Executes a single-hop swap
     * @dev Simplified swap that uses configured ratio or 1:1 default
     */
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        require(params.deadline >= block.timestamp, "MockRouter: expired");
        require(params.amountIn > 0, "MockRouter: zero amount");

        // Get swap ratio (default to 1:1 if not set)
        uint256 ratio = swapRatios[params.tokenIn][params.tokenOut];
        if (ratio == 0) {
            ratio = DEFAULT_RATIO;
        }

        // Calculate output amount based on ratio
        amountOut = (params.amountIn * ratio) / 10000;
        require(amountOut >= params.amountOutMinimum, "MockRouter: insufficient output");

        // Transfer tokens
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);

        emit SwapExecuted(params.tokenIn, params.tokenOut, params.amountIn, amountOut, params.recipient);
    }

    /**
     * @notice Funds the router with tokens for testing
     * @dev Allows test setup to provide liquidity for swaps
     */
    function fundRouter(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }
}
