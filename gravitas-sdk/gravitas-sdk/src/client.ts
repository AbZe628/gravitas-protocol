import { JsonRpcProvider, Interface } from "ethers";
import { GravitasConfig, MigrationPolicy, SimulationResult, TransactionPayload } from "./types";
import { validatePolicy } from "./utils/validatePolicy";
import { resolveAdapter } from "./utils/resolveAdapters";
import { simulateMigration } from "./utils/simulateMigration";
import { GravitasError } from "./errors";

const TELEPORT_ABI = [
  "function executeMigration(string memory sourceId, string memory targetId, address tokenA, address tokenB, uint256 liquidity, uint256 minLpOut, uint256 deadline) external returns (uint256 lpOut)"
];

/**
 * GravitasClient
 * * The primary entry point for developers integrating with the Vortex Layer.
 * This class handles policy validation, simulation, and transaction construction.
 * * It DOES NOT manage private keys or sign transactions.
 */
export class GravitasClient {
  private provider: JsonRpcProvider;
  private iface: Interface;

  constructor(private config: GravitasConfig) {
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.iface = new Interface(TELEPORT_ABI);
  }

  /**
   * Validates a migration policy against protocol constraints.
   * Performs strictly local checks (timestamp, math, logic).
   */
  public validateMigrationPolicy(policy: MigrationPolicy): boolean {
    validatePolicy(policy);
    
    // Ensure adapters exist for this chain
    resolveAdapter(this.config.chainId, policy.sourceAdapterId);
    resolveAdapter(this.config.chainId, policy.targetAdapterId);
    
    return true;
  }

  /**
   * Simulates the migration off-chain to predict outcomes and gas usage.
   * This step is recommended before building the actual transaction.
   */
  public async simulateMigration(policy: MigrationPolicy): Promise<SimulationResult> {
    try {
      this.validateMigrationPolicy(policy);

      const sourceAdapter = resolveAdapter(this.config.chainId, policy.sourceAdapterId);
      const targetAdapter = resolveAdapter(this.config.chainId, policy.targetAdapterId);

      // In v0.1, we pass adapters to the pure simulation logic
      return await simulateMigration(policy, sourceAdapter, targetAdapter);
    } catch (error) {
       if (error instanceof GravitasError) {
         throw error;
       }
       throw new Error(`Simulation Runtime Error: ${(error as Error).message}`);
    }
  }

  /**
   * Constructs the low-level transaction payload for the Teleport contract.
   * The result can be passed to ethers.Signer.sendTransaction().
   */
  public buildMigrationTx(policy: MigrationPolicy): TransactionPayload {
    // 1. Final Safety Check
    this.validateMigrationPolicy(policy);

    // 2. Encode
    const calldata = this.iface.encodeFunctionData("executeMigration", [
      policy.sourceAdapterId,
      policy.targetAdapterId,
      policy.tokenA,
      policy.tokenB,
      policy.liquidityAmount,
      policy.minLpOut,
      policy.deadline
    ]);

    // 3. Construct Payload
    return {
      to: this.config.teleportAddress,
      data: calldata,
      value: 0n,
      chainId: this.config.chainId
    };
  }
}
