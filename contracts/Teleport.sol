// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GravitasPolicyRegistry.sol";

// --- Interfaces ---
interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV2Router01 {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
}
// --- End Interfaces ---

/**
 * @title TeleportV2 (Institutional Edition)
 * @notice The core V2 engine for deterministic liquidity migration between V2-compatible DEXs.
 * @dev This contract implements the "Policy-Constrained Smart Routing" logic, ensuring
 *      atomic execution and compliance with Shariah governance rules via the Policy Registry.
 */
contract Teleport is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Immutable reference to the Gravitas Policy Registry contract.
    GravitasPolicyRegistry public immutable registry;

    // --------------------
    // Policy Controls
    // --------------------
    /// @notice Minimum time (in seconds) that must pass between migrations for the same pair/router combination.
    /// @dev This policy helps mitigate front-running and high-frequency speculative movements (Maysir avoidance).
    uint256 public cooldownSeconds = 15 minutes;
    
    /// @notice Maximum percentage of the total LP balance that can be moved in a single transaction, in Basis Points (e.g., 2000 = 20%).
    /// @dev This policy is a risk control mechanism to prevent large, destabilizing capital movements.
    uint256 public maxMoveBps = 2000;

    /// @dev Mapping to track the last migration timestamp for a unique migration key (factory, pair, router, tokens).
    mapping(bytes32 => uint256) public lastMigrationAt;

    /// @dev Emitted when the protocol's core risk policies are updated by the owner.
    /// @param cooldownSeconds The new minimum cooldown period.
    /// @param maxMoveBps The new maximum move percentage in Basis Points.
    event PolicyUpdated(uint256 cooldownSeconds, uint256 maxMoveBps);
    
    /// @dev Emitted upon successful atomic liquidity migration.
    /// @param executor The address that initiated the migration (msg.sender).
    /// @param factoryFrom The address of the source DEX factory.
    /// @param routerTo The address of the target DEX router.
    /// @param pairFrom The address of the source LP pair contract.
    /// @param tokenA The address of the first token in the pair.
    /// @param tokenB The address of the second token in the pair.
    /// @param lpBurned The amount of LP tokens burned from the source pool.
    /// @param liquidityMinted The amount of new LP tokens minted in the target pool.
    /// @param recipient The address that received the newly minted LP tokens and any dust.
    event LiquidityMigrated(
        address indexed executor,
        address indexed factoryFrom,
        address indexed routerTo,
        address pairFrom,
        address tokenA,
        address tokenB,
        uint256 lpBurned,
        uint256 liquidityMinted,
        address recipient
    );

    /**
     * @dev Modifier to ensure the caller is either the contract owner or an authorized executor in the Policy Registry.
     */
    modifier onlyAuthorized() {
        require(registry.isExecutor(msg.sender) || msg.sender == owner(), "Teleport: not authorized");
        _;
    }

    /**
     * @notice Initializes the Teleport contract with the address of the Gravitas Policy Registry.
     * @dev The Policy Registry is an immutable dependency for all compliance and access control checks.
     * @param _registry The address of the deployed GravitasPolicyRegistry contract.
     */
    constructor(address _registry) Ownable(msg.sender) {
        require(_registry != address(0), "Teleport: zero registry");
        registry = GravitasPolicyRegistry(_registry);
    }

    /**
     * @notice Updates the core risk policies (cooldown and max move percentage).
     * @dev This function is part of the protocol's governance mechanism.
     * @param _cooldownSeconds The new cooldown period.
     * @param _maxMoveBps The new maximum move percentage in Basis Points.
     */
    function setPolicy(uint256 _cooldownSeconds, uint256 _maxMoveBps) external onlyOwner {
        require(_cooldownSeconds <= 7 days, "Teleport: cooldown too big");
        require(_maxMoveBps > 0 && _maxMoveBps <= 10_000, "Teleport: bad bps");
        cooldownSeconds = _cooldownSeconds;
        maxMoveBps = _maxMoveBps;
        emit PolicyUpdated(_cooldownSeconds, _maxMoveBps);
    }

    /**
     * @notice Executes an atomic liquidity migration from a source V2 pair to a target V2 router.
     * @dev This function performs the core "Burn LP -> Receive Tokens -> Add LP" logic.
     *      It enforces Shariah compliance (Asset Whitelisting) and risk policies (Cooldown, Max Move).
     * @param factoryFrom The address of the source DEX factory (e.g., Uniswap V2 Factory).
     * @param routerTo The address of the target DEX router (e.g., Sushiswap Router).
     * @param tokenA The address of the first token in the pair.
     * @param tokenB The address of the second token in the pair.
     * @param lpAmount The amount of LP tokens to burn from the source pool.
     * @param referenceLpBalance The total LP supply of the source pool (used for maxMoveBps calculation).
     * @param amountAMin The minimum amount of tokenA to accept from the burn (slippage control).
     * @param amountBMin The minimum amount of tokenB to accept from the burn (slippage control).
     * @param deadline Unix timestamp by which the transaction must be included.
     * @param recipient The address to receive the new LP tokens and any dust.
     */
    function migrateLiquidityV2(
        address factoryFrom,
        address routerTo,
        address tokenA,
        address tokenB,
        uint256 lpAmount,
        uint256 referenceLpBalance,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline,
        address recipient
    ) external nonReentrant onlyAuthorized {
        // 1. Compliance & Authorization Checks
        require(registry.isRouterAuthorized(routerTo), "Teleport: router not authorized");
        // Shariah Compliance Invariant: A non-compliant asset can NEVER enter a compliant pool.
        require(registry.areTokensCompliant(tokenA, tokenB), "Teleport: non-compliant assets");
        require(deadline >= block.timestamp, "Teleport: deadline passed");

        // 2. Policy Enforcement (Gharar and Risk Mitigation)
        require(referenceLpBalance > 0, "Teleport: bad reference");
        uint256 maxAllowed = (referenceLpBalance * maxMoveBps) / 10_000;
        require(lpAmount <= maxAllowed, "Teleport: exceeds maxMoveBps");

        address pairFrom = IUniswapV2Factory(factoryFrom).getPair(tokenA, tokenB);
        require(pairFrom != address(0), "Teleport: pairFrom not found");

        bytes32 key = keccak256(abi.encodePacked(factoryFrom, pairFrom, routerTo, tokenA, tokenB));
        require(block.timestamp >= lastMigrationAt[key] + cooldownSeconds, "Teleport: cooldown active");

        // 3. Execution: Burn (Remove Liquidity)
        IERC20(pairFrom).safeTransferFrom(msg.sender, address(this), lpAmount);
        IERC20(pairFrom).safeTransfer(pairFrom, lpAmount);
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(pairFrom).burn(address(this));

        // 4. Token Mapping
        address t0 = IUniswapV2Pair(pairFrom).token0();
        uint256 amountAOut = (t0 == tokenA) ? amount0 : amount1;
        uint256 amountBOut = (t0 == tokenA) ? amount1 : amount0;

        // 5. Execution: Add Liquidity (Deposit to Target)
        // Note: forceApprove is used for robustness against tokens like USDT/USDC.
        IERC20(tokenA).forceApprove(routerTo, amountAOut);
        IERC20(tokenB).forceApprove(routerTo, amountBOut);

        (,, uint256 liquidityMinted) = IUniswapV2Router01(routerTo).addLiquidity(
            tokenA,
            tokenB,
            amountAOut,
            amountBOut,
            amountAMin,
            amountBMin,
            recipient,
            deadline
        );

        // 6. Cleanup & State Update
        _refundDust(tokenA, recipient);
        _refundDust(tokenB, recipient);
        lastMigrationAt[key] = block.timestamp;

        emit LiquidityMigrated(
            msg.sender,
            factoryFrom,
            routerTo,
            pairFrom,
            tokenA,
            tokenB,
            lpAmount,
            liquidityMinted,
            recipient
        );
    }

    /**
     * @dev Internal helper function to refund any dust tokens remaining in the contract after the migration.
     * @param token The address of the token to refund.
     * @param recipient The address to send the dust to.
     */
    function _refundDust(address token, address recipient) internal {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(recipient, balance);
        }
    }

    /**
     * @notice Allows the owner to rescue any accidentally sent ERC20 tokens from the contract.
     * @dev This is a standard emergency function to prevent funds from being permanently locked.
     * @param tokenAddress The address of the token to rescue.
     * @param recipientAddress The address to send the rescued tokens to.
     */
    function rescueTokens(address tokenAddress, address recipientAddress) external onlyOwner {
        uint256 contractBalance = IERC20(tokenAddress).balanceOf(address(this));
        if (contractBalance > 0) {
            IERC20(tokenAddress).safeTransfer(recipientAddress, contractBalance);
        }
    }
}
