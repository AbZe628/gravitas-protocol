import { PublicClient, WalletClient, Address, parseAbi, encodeFunctionData } from 'viem';
import { MigrationParams, MigrationParamsSchema } from './types.js';
import { ComplianceService } from './compliance.js';

const TELEPORT_V3_ABI = parseAbi([
  'function teleportLiquidity((uint256 tokenId, uint24 newFee, int24 newTickLower, int24 newTickUpper, uint256 amount0MinMint, uint256 amount1MinMint, uint256 amount0MinDecrease, uint256 amount1MinDecrease, uint256 deadline, bool doSwap, bool zeroForOne, uint256 amountToSwap, uint256 amountOutSwapMin, uint24 swapFee) params) external returns (uint256 newTokenId, uint128 newLiquidity)',
  'function positionManager() view returns (address)',
]);

const POSITION_MANAGER_ABI = parseAbi([
  'function positions(uint256 tokenId) view returns (uint96, address, address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128)',
]);

/**
 * @title MigrationBuilder
 * @notice Fluent API for constructing and validating institutional migrations.
 */
export class MigrationBuilder {
  private params: Partial<MigrationParams> = {
    doSwap: false,
    zeroForOne: false,
    amountToSwap: 0n,
    amountOutSwapMin: 0n,
    swapFee: 0,
  };

  constructor(
    private compliance: ComplianceService,
    private publicClient: PublicClient,
    private teleportAddress: Address
  ) {}

  tokenId(id: bigint) { this.params.tokenId = id; return this; }
  newFee(fee: number) { this.params.newFee = fee; return this; }
  ticks(lower: number, upper: number) { 
    this.params.newTickLower = lower; 
    this.params.newTickUpper = upper; 
    return this; 
  }
  slippage(mint0: bigint, mint1: bigint, dec0: bigint, dec1: bigint) {
    this.params.amount0MinMint = mint0;
    this.params.amount1MinMint = mint1;
    this.params.amount0MinDecrease = dec0;
    this.params.amount1MinDecrease = dec1;
    return this;
  }
  deadline(time: bigint) { this.params.deadline = time; return this; }
  
  withSwap(zeroForOne: boolean, amount: bigint, minOut: bigint, fee: number) {
    this.params.doSwap = true;
    this.params.zeroForOne = zeroForOne;
    this.params.amountToSwap = amount;
    this.params.amountOutSwapMin = minOut;
    this.params.swapFee = fee;
    return this;
  }

  /**
   * @notice Performs Shariah pre-flight checks and simulates the transaction.
   */
  async simulate(account: Address) {
    const validatedParams = MigrationParamsSchema.parse(this.params);
    
    // 1. Fetch tokens from PositionManager to check compliance
    const posManagerAddress = await this.publicClient.readContract({
      address: this.teleportAddress,
      abi: TELEPORT_V3_ABI,
      functionName: 'positionManager',
    });

    const [, , token0, token1] = await this.publicClient.readContract({
      address: posManagerAddress as Address,
      abi: POSITION_MANAGER_ABI,
      functionName: 'positions',
      args: [validatedParams.tokenId],
    });

    // 2. Shariah Pre-Flight Check
    await this.compliance.validateTokens(token0 as Address, token1 as Address);

    // 3. Simulation
    return this.publicClient.simulateContract({
      address: this.teleportAddress,
      abi: TELEPORT_V3_ABI,
      functionName: 'teleportLiquidity',
      args: [validatedParams],
      account,
    });
  }
}
