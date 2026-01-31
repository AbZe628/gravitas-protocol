import { PublicClient, WalletClient, Address, parseAbi, encodeFunctionData } from 'viem';
import { MigrationParams, MigrationParamsSchema } from './types.js';
import { ComplianceService } from './compliance.js';

/**
 * @title TeleportV3 ABI
 * @notice ABI for the TeleportV3 Deterministic Liquidity Routing Engine.
 * @dev Function names match exactly with the deployed contract (Bank-Grade synchronization).
 */
const TELEPORT_V3_ABI = parseAbi([
  // Core migration function - matches TeleportV3.executeAtomicMigration()
  'function executeAtomicMigration((uint256 tokenId, uint24 newFee, int24 newTickLower, int24 newTickUpper, uint256 amount0MinMint, uint256 amount1MinMint, uint256 amount0MinDecrease, uint256 amount1MinDecrease, uint256 deadline, bool executeSwap, bool zeroForOne, uint256 swapAmountIn, uint256 swapAmountOutMin, uint24 swapFeeTier) params) external returns (uint256 newTokenId, uint128 newLiquidity)',
  // View functions
  'function positionManager() view returns (address)',
  'function swapRouter() view returns (address)',
  'function registry() view returns (address)',
]);

const POSITION_MANAGER_ABI = parseAbi([
  'function positions(uint256 tokenId) view returns (uint96, address, address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128)',
  'function ownerOf(uint256 tokenId) view returns (address)',
]);

/**
 * @title MigrationBuilder
 * @author Gravitas Protocol Labs
 * @notice Fluent API for constructing and validating institutional migrations.
 * @dev Implements the "Intent Capture" phase of the Gravitas compliance flow.
 *      Provides a Stripe-like developer experience for bank-grade infrastructure.
 *
 *      USAGE EXAMPLE:
 *      ```typescript
 *      const result = await client.migration()
 *        .tokenId(123n)
 *        .newFee(3000)
 *        .ticks(-887220, 887220)
 *        .slippage(0n, 0n, 0n, 0n)
 *        .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
 *        .simulate(userAddress);
 *      ```
 */
export class MigrationBuilder {
  private params: Partial<MigrationParams> = {
    executeSwap: false,
    zeroForOne: false,
    swapAmountIn: 0n,
    swapAmountOutMin: 0n,
    swapFeeTier: 0,
  };

  constructor(
    private compliance: ComplianceService,
    private publicClient: PublicClient,
    private teleportAddress: Address
  ) {}

  /**
   * @notice Sets the NFT token ID of the position to migrate.
   * @param id The Uniswap V3 position NFT ID.
   */
  tokenId(id: bigint) { 
    this.params.tokenId = id; 
    return this; 
  }
  
  /**
   * @notice Sets the fee tier for the new position.
   * @param fee The fee tier (500 = 0.05%, 3000 = 0.3%, 10000 = 1%).
   */
  newFee(fee: number) { 
    this.params.newFee = fee; 
    return this; 
  }
  
  /**
   * @notice Sets the tick range for the new position.
   * @param lower The lower tick boundary.
   * @param upper The upper tick boundary.
   */
  ticks(lower: number, upper: number) { 
    this.params.newTickLower = lower; 
    this.params.newTickUpper = upper; 
    return this; 
  }
  
  /**
   * @notice Sets slippage protection parameters.
   * @dev GHARAR ELIMINATION: Ensures deterministic outcomes by setting minimum amounts.
   * @param mint0 Minimum token0 for new position.
   * @param mint1 Minimum token1 for new position.
   * @param dec0 Minimum token0 from liquidity removal.
   * @param dec1 Minimum token1 from liquidity removal.
   */
  slippage(mint0: bigint, mint1: bigint, dec0: bigint, dec1: bigint) {
    this.params.amount0MinMint = mint0;
    this.params.amount1MinMint = mint1;
    this.params.amount0MinDecrease = dec0;
    this.params.amount1MinDecrease = dec1;
    return this;
  }
  
  /**
   * @notice Sets the transaction deadline.
   * @param time Unix timestamp after which the transaction will revert.
   */
  deadline(time: bigint) { 
    this.params.deadline = time; 
    return this; 
  }
  
  /**
   * @notice Configures an optional rebalancing swap.
   * @param zeroForOne Swap direction (true = token0 → token1).
   * @param amount Amount to swap.
   * @param minOut Minimum output amount (slippage protection).
   * @param fee Fee tier for the swap pool.
   */
  withSwap(zeroForOne: boolean, amount: bigint, minOut: bigint, fee: number) {
    this.params.executeSwap = true;
    this.params.zeroForOne = zeroForOne;
    this.params.swapAmountIn = amount;
    this.params.swapAmountOutMin = minOut;
    this.params.swapFeeTier = fee;
    return this;
  }

  /**
   * @notice Performs Shariah pre-flight checks and simulates the transaction.
   * @dev Implements the full compliance flow:
   *      1. Intent Capture (this builder)
   *      2. Deterministic Pathing (fetch position data)
   *      3. Risk & Compliance Check (validate tokens)
   *      4. Simulation (dry-run the transaction)
   *
   * @param account The address that will execute the migration.
   * @returns Simulation result with expected outcomes.
   * @throws {ShariahViolationError} If tokens are not Shariah-compliant.
   */
  async simulate(account: Address) {
    const validatedParams = MigrationParamsSchema.parse(this.params);
    
    // Step 1: Fetch Position Manager address from TeleportV3
    const posManagerAddress = await this.publicClient.readContract({
      address: this.teleportAddress,
      abi: TELEPORT_V3_ABI,
      functionName: 'positionManager',
    });

    // Step 2: Fetch token addresses from the position
    const [, , token0, token1] = await this.publicClient.readContract({
      address: posManagerAddress as Address,
      abi: POSITION_MANAGER_ABI,
      functionName: 'positions',
      args: [validatedParams.tokenId],
    });

    // Step 3: Shariah Pre-Flight Check (Risk & Compliance Oracle)
    await this.compliance.validateTokens(token0 as Address, token1 as Address);

    // Step 4: Simulate the atomic migration
    return this.publicClient.simulateContract({
      address: this.teleportAddress,
      abi: TELEPORT_V3_ABI,
      functionName: 'executeAtomicMigration',
      args: [validatedParams],
      account,
    });
  }

  /**
   * @notice Encodes the migration calldata for manual transaction submission.
   * @dev Useful for integrations that need raw calldata (e.g., multisig wallets).
   * @returns Encoded function calldata.
   */
  encodeCalldata(): `0x${string}` {
    const validatedParams = MigrationParamsSchema.parse(this.params);
    return encodeFunctionData({
      abi: TELEPORT_V3_ABI,
      functionName: 'executeAtomicMigration',
      args: [validatedParams],
    });
  }
}
