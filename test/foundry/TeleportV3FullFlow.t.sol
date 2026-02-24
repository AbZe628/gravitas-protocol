// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/TeleportV3.sol";
import "../../contracts/GravitasPolicyRegistry.sol";
import "../../contracts/mocks/MockUniswapV3PositionManager.sol";
import "../../contracts/mocks/MockUniswapV3SwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title DustMockPositionManager
 * @notice A mock position manager that only uses HALF the desired amounts,
 *         leaving the other half as dust to test the YUL assembly refund path.
 */
contract DustMockPositionManager is ERC721 {
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

    constructor() ERC721("Dust Mock V3 Position", "DUST-V3-POS") {}

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        require(params.deadline >= block.timestamp, "DustPM: expired");
        require(params.token0 < params.token1, "DustPM: token order");
        require(params.tickLower < params.tickUpper, "DustPM: invalid ticks");

        tokenId = _nextTokenId++;

        // Only use HALF the desired amounts — leaves the other half as dust
        amount0 = params.amount0Desired / 2;
        amount1 = params.amount1Desired / 2;

        require(amount0 >= params.amount0Min, "DustPM: insufficient amount0");
        require(amount1 >= params.amount1Min, "DustPM: insufficient amount1");

        liquidity = uint128(_sqrt(amount0 * amount1));
        require(liquidity > 0, "DustPM: zero liquidity");

        IERC20(params.token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(params.token1).safeTransferFrom(msg.sender, address(this), amount1);

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

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1)
    {
        require(params.deadline >= block.timestamp, "DustPM: expired");
        Position storage position = positions[params.tokenId];
        require(position.liquidity >= params.liquidity, "DustPM: insufficient liquidity");

        uint256 liquidityRatio = (uint256(params.liquidity) * 1e18) / uint256(position.liquidity);
        amount0 = (IERC20(position.token0).balanceOf(address(this)) * liquidityRatio) / 1e18;
        amount1 = (IERC20(position.token1).balanceOf(address(this)) * liquidityRatio) / 1e18;

        require(amount0 >= params.amount0Min, "DustPM: insufficient amount0");
        require(amount1 >= params.amount1Min, "DustPM: insufficient amount1");

        position.liquidity -= params.liquidity;
        position.tokensOwed0 += uint128(amount0);
        position.tokensOwed1 += uint128(amount1);
    }

    function collect(CollectParams calldata params) external payable returns (uint256 amount0, uint256 amount1) {
        Position storage position = positions[params.tokenId];

        amount0 = position.tokensOwed0 > params.amount0Max ? params.amount0Max : position.tokensOwed0;
        amount1 = position.tokensOwed1 > params.amount1Max ? params.amount1Max : position.tokensOwed1;

        position.tokensOwed0 -= uint128(amount0);
        position.tokensOwed1 -= uint128(amount1);

        if (amount0 > 0) IERC20(position.token0).safeTransfer(params.recipient, amount0);
        if (amount1 > 0) IERC20(position.token1).safeTransfer(params.recipient, amount1);
    }

    function burn(uint256 tokenId) external payable {
        require(_ownerOf(tokenId) == msg.sender, "DustPM: not owner");
        Position storage position = positions[tokenId];
        require(position.liquidity == 0, "DustPM: not cleared");
        require(position.tokensOwed0 == 0 && position.tokensOwed1 == 0, "DustPM: tokens owed");
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

contract TestTokenV3 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 10_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title TeleportV3FullFlowTests
 * @notice Comprehensive deterministic tests for Teleport V3 to reach >=80% coverage
 * @dev Includes swapExecuted=true scenarios with deterministic mocks
 */
contract TeleportV3FullFlowTests is Test {
    GravitasPolicyRegistry registry;
    TeleportV3 teleportV3;
    MockUniswapV3PositionManager positionManager;
    MockUniswapV3SwapRouter swapRouter;
    TestTokenV3 token0;
    TestTokenV3 token1;

    address owner = address(0x1);
    address executor = address(0x2);
    address user = address(0x3);
    uint256 userPrivateKey = 0x12345;

    bytes32 private constant MIGRATION_TYPEHASH = keccak256(
        "MigrationIntent(uint256 tokenId,uint24 newFee,int24 newTickLower,int24 newTickUpper,uint256 deadline,uint256 nonce)"
    );

    function setUp() public {
        // Use deterministic user address
        user = vm.addr(userPrivateKey);

        vm.startPrank(owner);

        // Deploy core contracts
        registry = new GravitasPolicyRegistry();
        positionManager = new MockUniswapV3PositionManager();
        swapRouter = new MockUniswapV3SwapRouter();
        teleportV3 = new TeleportV3(address(positionManager), address(swapRouter), address(registry));

        // Deploy test tokens (ensure token0 < token1)
        TestTokenV3 tokenA = new TestTokenV3("Token A", "TKA");
        TestTokenV3 tokenB = new TestTokenV3("Token B", "TKB");

        if (address(tokenA) < address(tokenB)) {
            token0 = tokenA;
            token1 = tokenB;
        } else {
            token0 = tokenB;
            token1 = tokenA;
        }

        // Setup compliance
        registry.setAssetCompliance(address(token0), true);
        registry.setAssetCompliance(address(token1), true);
        registry.setExecutorStatus(executor, true);

        // Fund user
        token0.mint(user, 1000 ether);
        token1.mint(user, 1000 ether);

        // Fund swap router for swaps
        token0.mint(address(swapRouter), 10000 ether);
        token1.mint(address(swapRouter), 10000 ether);

        vm.stopPrank();
    }

    /**
     * @notice Helper to create a V3 position
     */
    function _createPosition(
        address posOwner,
        uint256 amount0,
        uint256 amount1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper
    ) internal returns (uint256 tokenId) {
        vm.startPrank(posOwner);
        token0.approve(address(positionManager), amount0);
        token1.approve(address(positionManager), amount1);

        (tokenId,,,) = positionManager.mint(
            MockUniswapV3PositionManager.MintParams({
                token0: address(token0),
                token1: address(token1),
                fee: fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 1,
                amount1Min: 1,
                recipient: posOwner,
                deadline: block.timestamp + 1 hours
            })
        );
        vm.stopPrank();
    }

    /**
     * @notice Helper to sign migration intent
     */
    function _signMigration(
        uint256 privateKey,
        uint256 tokenId,
        uint24 newFee,
        int24 newTickLower,
        int24 newTickUpper,
        uint256 deadline,
        uint256 nonce
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(MIGRATION_TYPEHASH, tokenId, newFee, newTickLower, newTickUpper, deadline, nonce)
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("GravitasTeleportV3")),
                keccak256(bytes("1")),
                block.chainid,
                address(teleportV3)
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    /**
     * @notice Test full migration WITHOUT swap (swapExecuted=false)
     */
    function test_V3_FullMigration_NoSwap() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        (uint256 newTokenId, uint128 newLiquidity) = teleportV3.executeAtomicMigration(params, signature);

        assertTrue(newTokenId > 0);
        assertTrue(newLiquidity > 0);
    }

    /**
     * @notice Test full migration WITH swap (swapExecuted=true) - DETERMINISTIC
     * @dev This covers the swap execution path to increase coverage
     */
    function test_V3_FullMigration_WithSwap() public {
        // Create position with imbalanced amounts to simulate need for swap
        uint256 tokenId = _createPosition(user, 100 ether, 50 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: true, // ENABLE SWAP
            zeroForOne: true, // Swap token0 for token1
            swapAmountIn: 10 ether, // Swap 10 token0
            swapAmountOutMin: 1, // Accept any output for testing
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        (uint256 newTokenId, uint128 newLiquidity) = teleportV3.executeAtomicMigration(params, signature);

        assertTrue(newTokenId > 0);
        assertTrue(newLiquidity > 0);
    }

    /**
     * @notice Test nonce increment and replay protection
     */
    function test_V3_NonceReplayProtection() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        teleportV3.executeAtomicMigration(params, signature);

        // Nonce should have incremented
        assertEq(teleportV3.nonces(user), 1);

        // Try to replay same signature - should fail
        uint256 tokenId2 = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);
        params.tokenId = tokenId2;

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId2);

        vm.prank(executor);
        vm.expectRevert("TV3: Invalid signature");
        teleportV3.executeAtomicMigration(params, signature);
    }

    /**
     * @notice Test wrong signer signature
     */
    function test_V3_WrongSigner() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        // Sign with wrong private key
        uint256 wrongPrivateKey = 0x99999;
        bytes memory wrongSignature = _signMigration(
            wrongPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        vm.expectRevert("TV3: Invalid signature");
        teleportV3.executeAtomicMigration(params, wrongSignature);
    }

    /**
     * @notice Test modified params signature mismatch
     */
    function test_V3_ModifiedParams() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        // Modify ticks after signing (keeping fee valid to pass tick spacing check)
        params.newTickLower = -20; // Changed!
        params.newTickUpper = 20; // Changed!

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        vm.expectRevert("TV3: Invalid signature");
        teleportV3.executeAtomicMigration(params, signature);
    }

    /**
     * @notice Test all valid fee tiers
     */
    function test_V3_AllValidFeeTiers() public {
        uint24[4] memory validFees = [uint24(100), uint24(500), uint24(3000), uint24(10000)];
        int24[4] memory validSpacings = [int24(1), int24(10), int24(60), int24(200)];

        for (uint256 i = 0; i < validFees.length; i++) {
            uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

            TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
                tokenId: tokenId,
                newFee: validFees[i],
                newTickLower: -validSpacings[i],
                newTickUpper: validSpacings[i],
                amount0MinMint: 1,
                amount1MinMint: 1,
                amount0MinDecrease: 1,
                amount1MinDecrease: 1,
                deadline: block.timestamp + 1 hours,
                executeSwap: false,
                zeroForOne: false,
                swapAmountIn: 0,
                swapAmountOutMin: 0,
                swapFeeTier: validFees[i]
            });

            bytes memory signature = _signMigration(
                userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, i
            );

            vm.prank(user);
            positionManager.approve(address(teleportV3), tokenId);

            vm.prank(executor);
            teleportV3.executeAtomicMigration(params, signature);
        }
    }

    /**
     * @notice Test dust refund (zero dust case)
     */
    function test_V3_DustRefund_ZeroDust() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        uint256 userBalance0Before = token0.balanceOf(user);
        uint256 userBalance1Before = token1.balanceOf(user);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        teleportV3.executeAtomicMigration(params, signature);

        // Check dust was refunded (balance should be >= before)
        assertGe(token0.balanceOf(user), userBalance0Before);
        assertGe(token1.balanceOf(user), userBalance1Before);
    }

    /**
     * @notice Test revert on invalid ticks (tickLower >= tickUpper)
     */
    function test_V3_RevertOnInvalidTicks() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: 100, // Invalid: lower >= upper
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        vm.expectRevert("TV3: Invalid ticks");
        teleportV3.executeAtomicMigration(params, signature);
    }

    /**
     * @notice Test revert on non-compliant assets
     */
    function test_V3_RevertOnNonCompliantAssets() public {
        // Create a non-compliant token
        TestTokenV3 badToken = new TestTokenV3("Bad Token", "BAD");

        // Create position with non-compliant token (this will fail in real scenario)
        // For testing, we'll use compliant tokens but then revoke compliance
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        // Revoke compliance
        vm.prank(owner);
        registry.setAssetCompliance(address(token0), false);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        vm.expectRevert("TV3: Non-compliant assets");
        teleportV3.executeAtomicMigration(params, signature);
    }

    /**
     * @notice Test revert on swap amount exceeding available
     */
    function test_V3_RevertOnSwapExceedsAvailable() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: true,
            zeroForOne: true,
            swapAmountIn: 1000 ether, // More than available
            swapAmountOutMin: 1,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        vm.expectRevert("TV3: Swap exceeds available");
        teleportV3.executeAtomicMigration(params, signature);
    }

    /**
     * @notice Test onERC721Received callback
     */
    function test_V3_OnERC721Received() public {
        bytes4 selector = teleportV3.onERC721Received(address(0), address(0), 0, "");
        assertEq(selector, teleportV3.onERC721Received.selector);
    }

    /**
     * @notice Test owner can execute (not just executor)
     */
    function test_V3_OwnerCanExecute() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        // Owner executes instead of executor
        vm.prank(owner);
        teleportV3.executeAtomicMigration(params, signature);
    }

    /**
     * @notice Test dust refund WITH actual dust (covers YUL assembly path)
     * @dev Uses a DustMockPositionManager that only uses HALF the tokens when minting,
     *      leaving the other half as dust. This triggers balanceAfter > balanceBefore
     *      in _refundDustOptimized, executing the YUL assembly transfer path.
     */
    function test_V3_DustRefund_WithDust() public {
        // Deploy a special dust-generating position manager and a new TeleportV3 instance
        DustMockPositionManager dustPM = new DustMockPositionManager();
        MockUniswapV3SwapRouter dustSwapRouter = new MockUniswapV3SwapRouter();

        vm.startPrank(owner);
        GravitasPolicyRegistry dustRegistry = new GravitasPolicyRegistry();
        dustRegistry.setAssetCompliance(address(token0), true);
        dustRegistry.setAssetCompliance(address(token1), true);
        dustRegistry.setExecutorStatus(executor, true);
        TeleportV3 dustTeleport = new TeleportV3(address(dustPM), address(dustSwapRouter), address(dustRegistry));
        vm.stopPrank();

        // Create a position using the dust position manager
        vm.startPrank(user);
        token0.approve(address(dustPM), 100 ether);
        token1.approve(address(dustPM), 100 ether);
        (uint256 tokenId,,,) = dustPM.mint(
            DustMockPositionManager.MintParams({
                token0: address(token0),
                token1: address(token1),
                fee: 3000,
                tickLower: -600,
                tickUpper: 600,
                amount0Desired: 100 ether,
                amount1Desired: 100 ether,
                amount0Min: 1,
                amount1Min: 1,
                recipient: user,
                deadline: block.timestamp + 1 hours
            })
        );
        vm.stopPrank();

        uint256 userBalance0Before = token0.balanceOf(user);
        uint256 userBalance1Before = token1.balanceOf(user);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 500,
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        // Sign with the dustTeleport address as verifying contract
        bytes32 structHash = keccak256(
            abi.encode(
                MIGRATION_TYPEHASH,
                tokenId,
                params.newFee,
                params.newTickLower,
                params.newTickUpper,
                params.deadline,
                uint256(0)
            )
        );
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("GravitasTeleportV3")),
                keccak256(bytes("1")),
                block.chainid,
                address(dustTeleport)
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(user);
        dustPM.approve(address(dustTeleport), tokenId);

        vm.prank(executor);
        (uint256 newTokenId, uint128 newLiquidity) = dustTeleport.executeAtomicMigration(params, signature);

        assertTrue(newTokenId > 0);
        assertTrue(newLiquidity > 0);
        // User should have received the dust (half the tokens not used by DustMockPositionManager)
        assertGt(token0.balanceOf(user), userBalance0Before);
        assertGt(token1.balanceOf(user), userBalance1Before);
    }

    /**
     * @notice Test _getTickSpacing revert on unsupported fee (covers line 242)
     * @dev Uses an invalid fee tier to trigger the revert in _getTickSpacing
     */
    function test_V3_RevertOnUnsupportedFee() public {
        uint256 tokenId = _createPosition(user, 100 ether, 100 ether, 3000, -600, 600);

        TeleportV3.AtomicMigrationParams memory params = TeleportV3.AtomicMigrationParams({
            tokenId: tokenId,
            newFee: 9999, // Invalid fee tier
            newTickLower: -10,
            newTickUpper: 10,
            amount0MinMint: 1,
            amount1MinMint: 1,
            amount0MinDecrease: 1,
            amount1MinDecrease: 1,
            deadline: block.timestamp + 1 hours,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: 0,
            swapAmountOutMin: 0,
            swapFeeTier: 500
        });

        bytes memory signature = _signMigration(
            userPrivateKey, tokenId, params.newFee, params.newTickLower, params.newTickUpper, params.deadline, 0
        );

        vm.prank(user);
        positionManager.approve(address(teleportV3), tokenId);

        vm.prank(executor);
        vm.expectRevert("TV3: Invalid fee tier");
        teleportV3.executeAtomicMigration(params, signature);
    }

    /**
     * @notice Test constructor validation
     */
    function test_V3_ConstructorValidation() public {
        vm.expectRevert("TV3: Invalid PositionManager");
        new TeleportV3(address(0), address(swapRouter), address(registry));

        vm.expectRevert("TV3: Invalid SwapRouter");
        new TeleportV3(address(positionManager), address(0), address(registry));

        vm.expectRevert("TV3: Invalid Registry");
        new TeleportV3(address(positionManager), address(swapRouter), address(0));
    }
}
