// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockUniswapV2Pair
 * @notice Minimal deterministic mock for Uniswap V2 Pair testing
 * @dev Used for testing only - not for production deployment
 */
contract MockUniswapV2Pair is ERC20 {
    using SafeERC20 for IERC20;

    address public token0;
    address public token1;
    uint112 private reserve0;
    uint112 private reserve1;

    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);

    constructor(address _token0, address _token1) ERC20("Mock LP Token", "MOCK-LP") {
        require(_token0 != address(0) && _token1 != address(0), "MockPair: zero address");
        token0 = _token0;
        token1 = _token1;
    }

    /**
     * @notice Simulates adding liquidity and minting LP tokens
     * @dev Transfers tokens from msg.sender and mints LP tokens
     */
    function mint(address to, uint256 amount0, uint256 amount1) external returns (uint256 liquidity) {
        require(amount0 > 0 && amount1 > 0, "MockPair: insufficient amounts");

        // Transfer tokens to this contract
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        // Simple liquidity calculation (geometric mean)
        liquidity = _sqrt(amount0 * amount1);
        require(liquidity > 0, "MockPair: insufficient liquidity minted");

        _mint(to, liquidity);
        reserve0 += uint112(amount0);
        reserve1 += uint112(amount1);

        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @notice Simulates removing liquidity by burning LP tokens
     * @dev Burns LP tokens and returns underlying tokens proportionally
     */
    function burn(address to) external returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        require(liquidity > 0, "MockPair: insufficient liquidity burned");

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        require(amount0 > 0 && amount1 > 0, "MockPair: insufficient liquidity burned");

        _burn(address(this), liquidity);
        IERC20(token0).safeTransfer(to, amount0);
        IERC20(token1).safeTransfer(to, amount1);

        reserve0 = uint112(IERC20(token0).balanceOf(address(this)));
        reserve1 = uint112(IERC20(token1).balanceOf(address(this)));

        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @notice Returns current reserves
     */
    function getReserves() external view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        return (reserve0, reserve1, uint32(block.timestamp));
    }

    /**
     * @dev Simple square root implementation for liquidity calculation
     */
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
