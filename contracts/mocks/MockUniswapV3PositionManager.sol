// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockUniswapV3PositionManager
 * @notice Minimal deterministic mock for Uniswap V3 Position Manager testing
 * @dev Used for testing only - not for production deployment
 */
contract MockUniswapV3PositionManager is ERC721 {
    using SafeERC20 for IERC20;

    struct Position {
        uint96 nonce;
        address operator;
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
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

    mapping(uint256 => Position) public positions;
    uint256 private _nextTokenId = 1;

    constructor() ERC721("Mock Uniswap V3 Position", "MOCK-UNI-V3-POS") {}

    /**
     * @notice Mints a new V3 position NFT
     */
    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        require(params.deadline >= block.timestamp, "MockPM: expired");
        require(params.token0 < params.token1, "MockPM: token order");
        require(params.tickLower < params.tickUpper, "MockPM: invalid ticks");

        tokenId = _nextTokenId++;

        // Use desired amounts as actual amounts for simplicity
        amount0 = params.amount0Desired;
        amount1 = params.amount1Desired;

        require(amount0 >= params.amount0Min, "MockPM: insufficient amount0");
        require(amount1 >= params.amount1Min, "MockPM: insufficient amount1");

        // Simple liquidity calculation
        liquidity = uint128(_sqrt(amount0 * amount1));
        require(liquidity > 0, "MockPM: zero liquidity");

        // Transfer tokens
        IERC20(params.token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(params.token1).safeTransferFrom(msg.sender, address(this), amount1);

        // Store position
        positions[tokenId] = Position({
            nonce: 0,
            operator: address(0),
            token0: params.token0,
            token1: params.token1,
            fee: params.fee,
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            liquidity: liquidity,
            feeGrowthInside0LastX128: 0,
            feeGrowthInside1LastX128: 0,
            tokensOwed0: 0,
            tokensOwed1: 0
        });

        _mint(params.recipient, tokenId);
    }

    /**
     * @notice Decreases liquidity in a position
     */
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1)
    {
        require(params.deadline >= block.timestamp, "MockPM: expired");
        require(_ownerOf(params.tokenId) != address(0), "MockPM: invalid token");

        Position storage position = positions[params.tokenId];
        require(position.liquidity >= params.liquidity, "MockPM: insufficient liquidity");

        // Calculate proportional amounts (simplified)
        uint256 liquidityRatio = (uint256(params.liquidity) * 1e18) / uint256(position.liquidity);
        amount0 = (IERC20(position.token0).balanceOf(address(this)) * liquidityRatio) / 1e18;
        amount1 = (IERC20(position.token1).balanceOf(address(this)) * liquidityRatio) / 1e18;

        require(amount0 >= params.amount0Min, "MockPM: insufficient amount0");
        require(amount1 >= params.amount1Min, "MockPM: insufficient amount1");

        position.liquidity -= params.liquidity;
        position.tokensOwed0 += uint128(amount0);
        position.tokensOwed1 += uint128(amount1);
    }

    /**
     * @notice Collects tokens owed to a position
     */
    function collect(CollectParams calldata params) external payable returns (uint256 amount0, uint256 amount1) {
        require(_ownerOf(params.tokenId) != address(0), "MockPM: invalid token");

        Position storage position = positions[params.tokenId];

        amount0 = position.tokensOwed0 > params.amount0Max ? params.amount0Max : position.tokensOwed0;
        amount1 = position.tokensOwed1 > params.amount1Max ? params.amount1Max : position.tokensOwed1;

        position.tokensOwed0 -= uint128(amount0);
        position.tokensOwed1 -= uint128(amount1);

        if (amount0 > 0) IERC20(position.token0).safeTransfer(params.recipient, amount0);
        if (amount1 > 0) IERC20(position.token1).safeTransfer(params.recipient, amount1);
    }

    /**
     * @notice Burns a position NFT
     */
    function burn(uint256 tokenId) external payable {
        require(_ownerOf(tokenId) == msg.sender, "MockPM: not owner");
        Position storage position = positions[tokenId];
        require(position.liquidity == 0, "MockPM: not cleared");
        require(position.tokensOwed0 == 0 && position.tokensOwed1 == 0, "MockPM: tokens owed");

        delete positions[tokenId];
        _burn(tokenId);
    }

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
