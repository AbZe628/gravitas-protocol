import { PublicClient, Address, parseAbi } from "viem";
import { MigrationParams, MigrationParamsSchema } from "./types.js";
import { ComplianceService } from "./compliance.js";

/**
 * @notice ABI for the TeleportV3 contract.
 * @dev Synchronized with TeleportV3.sol (v1.0.0)
 */
const TELEPORT_V3_ABI = parseAbi([
  "function teleportLiquidity((uint256 tokenId, uint24 newFee, int24 newTickLower, int24 newTickUpper, uint256 amount0MinMint, uint256 amount1MinMint, uint256 amount0MinDecrease, uint256 amount1MinDecrease, uint256 deadline, bool doSwap, bool zeroForOne, uint256 amountToSwap, uint256 amountOutSwapMin, uint24 swapFee) params) external returns (uint256 newTokenId, uint128 newLiquidity)",
  "function positionManager() view returns (address)",
]);

/**
 * @notice ABI for the Uniswap V3 NonfungiblePositionManager.
 */
const POSITION_MANAGER_ABI = parseAbi([
  "function positions(uint256 tokenId) view returns (uint96, address, address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128)",
]);

/**
 * @title MigrationBuilder
 * @notice Fluent API for constructing and validating institutional migrations.
 */
export class MigrationBuilder {
  private migrationParams: Partial<MigrationParams> = {
    doSwap: false,
    zeroForOne: false,
    amountToSwap: 0n,
    amountOutSwapMin: 0n,
    swapFee: 0,
  };

  constructor(
    private readonly complianceService: ComplianceService,
    private readonly publicClient: PublicClient,
    private readonly teleportAddress: Address
  ) {}

  tokenId(id: bigint) {
    this.migrationParams.tokenId = id;
    return this;
  }
  newFee(fee: number) {
    this.migrationParams.newFee = fee;
    return this;
  }
  ticks(lower: number, upper: number) {
    this.migrationParams.newTickLower = lower;
    this.migrationParams.newTickUpper = upper;
    return this;
  }
  slippage(mint0: bigint, mint1: bigint, dec0: bigint, dec1: bigint) {
    this.migrationParams.amount0MinMint = mint0;
    this.migrationParams.amount1MinMint = mint1;
    this.migrationParams.amount0MinDecrease = dec0;
    this.migrationParams.amount1MinDecrease = dec1;
    return this;
  }
  deadline(timestamp: bigint) {
    this.migrationParams.deadline = timestamp;
    return this;
  }

  withSwap(zeroForOne: boolean, amount: bigint, minOut: bigint, fee: number) {
    this.migrationParams.doSwap = true;
    this.migrationParams.zeroForOne = zeroForOne;
    this.migrationParams.amountToSwap = amount;
    this.migrationParams.amountOutSwapMin = minOut;
    this.migrationParams.swapFee = fee;
    return this;
  }

  /**
   * @notice Performs Shariah pre-flight checks and simulates the transaction.
   * @param accountAddress The address of the institutional account initiating the migration.
   */
  async simulate(accountAddress: Address) {
    const validatedParams = MigrationParamsSchema.parse(this.migrationParams);

    // 1. Fetch tokens from PositionManager to check compliance
    const positionManagerAddress = await this.publicClient.readContract({
      address: this.teleportAddress,
      abi: TELEPORT_V3_ABI,
      functionName: "positionManager",
    });

    const [, , token0, token1] = await this.publicClient.readContract({
      address: positionManagerAddress as Address,
      abi: POSITION_MANAGER_ABI,
      functionName: "positions",
      args: [validatedParams.tokenId],
    });

    // 2. Shariah Pre-Flight Check
    await this.complianceService.validateTokens(
      token0 as Address,
      token1 as Address
    );

    // 3. Simulation
    return this.publicClient.simulateContract({
      address: this.teleportAddress,
      abi: TELEPORT_V3_ABI,
      functionName: "teleportLiquidity",
      args: [validatedParams],
      account: accountAddress,
    });
  }
}
