import { createPublicClient, http, PublicClient, Address } from 'viem';
import { ClientConfig, ClientConfigSchema } from './types.js';
import { ComplianceService } from './compliance.js';
import { MigrationBuilder } from './teleport.js';

export * from './types.js';
export * from './compliance.js';
export * from './teleport.js';

/**
 * @title GravitasClient
 * @notice The primary entry point for institutional interaction with the Gravitas Protocol.
 */
export class GravitasClient {
  public readonly publicClient: PublicClient;
  public readonly compliance: ComplianceService;

  constructor(private config: ClientConfig) {
    ClientConfigSchema.parse(config);
    
    this.publicClient = createPublicClient({
      chain: { id: config.chainId } as any,
      transport: http(config.rpcUrl),
    });

    this.compliance = new ComplianceService(
      this.publicClient,
      config.registryAddress
    );
  }

  /**
   * @notice Starts a new fluent migration construction.
   */
  migration() {
    return new MigrationBuilder(
      this.compliance,
      this.publicClient,
      this.config.teleportV3Address
    );
  }
}
