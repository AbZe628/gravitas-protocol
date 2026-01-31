import { PublicClient, Address, parseAbi } from 'viem';
import { ShariahViolationError } from './types.js';

/**
 * @title GravitasPolicyRegistry ABI
 * @notice ABI for the Risk & Compliance Oracle.
 * @dev Function names match exactly with the deployed contract (Bank-Grade synchronization).
 */
const REGISTRY_ABI = parseAbi([
  // Compliance verification functions
  'function isAssetCompliant(address asset) view returns (bool)',
  'function isRouterAuthorized(address router) view returns (bool)',
  'function areTokensCompliant(address tokenA, address tokenB) view returns (bool)',
  'function verifyAssetCompliance(address asset) view returns (bool compliant)',
  'function verifyRouterAuthorization(address router) view returns (bool authorized)',
  'function verifyExecutorStatus(address executor) view returns (bool authorized)',
  // Direct mapping accessors
  'function isExecutor(address executor) view returns (bool)',
]);

/**
 * @title ComplianceService
 * @author Gravitas Protocol Labs
 * @notice Handles Shariah "Pre-Flight" checks by querying the on-chain Policy Registry.
 * @dev Implements the "Risk & Compliance Check" phase of the Gravitas compliance flow.
 *
 *      COMPLIANCE FLOW:
 *      ┌────────────────────────────────────────────────────────────────────────────────┐
 *      │ 1. validateTokens() - Check if token pair is Shariah-compliant               │
 *      │ 2. validateRouter() - Check if router is authorized for institutional use    │
 *      │ 3. validateExecutor() - Check if caller is authorized to execute migrations  │
 *      └────────────────────────────────────────────────────────────────────────────────┘
 *
 *      SHARIAH GOVERNANCE:
 *      • NO RIBA: Excludes interest-bearing tokens
 *      • GHARAR ELIMINATION: Deterministic validation before routing
 *      • MAYSIR AVOIDANCE: Filters gambling and speculative assets
 */
export class ComplianceService {
  constructor(
    private client: PublicClient,
    private registryAddress: Address
  ) {}

  /**
   * @notice Validates if a pair of tokens is Shariah-compliant.
   * @dev GHARAR ELIMINATION: Ensures deterministic compliance validation before any routing.
   *      Both tokens must be whitelisted in the Policy Registry.
   *
   * @param tokenA The address of the first token.
   * @param tokenB The address of the second token.
   * @throws {ShariahViolationError} If any token is non-compliant.
   */
  async validateTokens(tokenA: Address, tokenB: Address): Promise<void> {
    const isCompliant = await this.client.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'areTokensCompliant',
      args: [tokenA, tokenB],
    });

    if (!isCompliant) {
      throw new ShariahViolationError(
        `Token pair [${tokenA}, ${tokenB}] failed Shariah compliance check. ` +
        `One or more assets may be associated with Riba (interest), Gharar (uncertainty), or Maysir (speculation).`
      );
    }
  }

  /**
   * @notice Validates if a single asset is Shariah-compliant.
   * @dev Used during the "Intent Capture" phase for early validation.
   *
   * @param asset The token address to validate.
   * @throws {ShariahViolationError} If the asset is non-compliant.
   */
  async validateAsset(asset: Address): Promise<void> {
    const isCompliant = await this.client.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'isAssetCompliant',
      args: [asset],
    });

    if (!isCompliant) {
      throw new ShariahViolationError(
        `Asset [${asset}] is not Shariah-compliant. ` +
        `This token may be associated with prohibited activities (gambling, alcohol, interest-bearing instruments).`
      );
    }
  }

  /**
   * @notice Validates if a router is authorized for institutional use.
   * @dev POLICY-CONSTRAINED ROUTING: Ensures only audited, trusted liquidity venues are used.
   *
   * @param router The router address to validate.
   * @throws {ShariahViolationError} If the router is not authorized.
   */
  async validateRouter(router: Address): Promise<void> {
    const isAuthorized = await this.client.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'isRouterAuthorized',
      args: [router],
    });

    if (!isAuthorized) {
      throw new ShariahViolationError(
        `Router [${router}] is not authorized by the Gravitas Policy Registry. ` +
        `Only audited and trusted liquidity venues are permitted for institutional use.`
      );
    }
  }

  /**
   * @notice Validates if an address is an authorized executor.
   * @dev INSTITUTIONAL ACCESS CONTROL: Ensures only authorized entities can execute migrations.
   *
   * @param executor The address to validate.
   * @throws {ShariahViolationError} If the executor is not authorized.
   */
  async validateExecutor(executor: Address): Promise<void> {
    const isAuthorized = await this.client.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'isExecutor',
      args: [executor],
    });

    if (!isAuthorized) {
      throw new ShariahViolationError(
        `Executor [${executor}] is not authorized in the Gravitas Policy Registry. ` +
        `Only registered institutional partners and keepers can execute migrations.`
      );
    }
  }

  /**
   * @notice Performs a comprehensive pre-flight compliance check.
   * @dev Validates tokens, router, and executor in a single call.
   *      This is the recommended method for full compliance validation.
   *
   * @param tokenA The address of the first token.
   * @param tokenB The address of the second token.
   * @param router The router address (optional).
   * @param executor The executor address (optional).
   */
  async performPreFlightCheck(
    tokenA: Address,
    tokenB: Address,
    router?: Address,
    executor?: Address
  ): Promise<void> {
    // Validate token pair compliance
    await this.validateTokens(tokenA, tokenB);

    // Validate router if provided
    if (router) {
      await this.validateRouter(router);
    }

    // Validate executor if provided
    if (executor) {
      await this.validateExecutor(executor);
    }
  }

  /**
   * @notice Checks compliance status without throwing errors.
   * @dev Useful for UI integrations that need to display compliance status.
   *
   * @param tokenA The address of the first token.
   * @param tokenB The address of the second token.
   * @returns Object containing compliance status for each check.
   */
  async getComplianceStatus(tokenA: Address, tokenB: Address): Promise<{
    tokenACompliant: boolean;
    tokenBCompliant: boolean;
    pairCompliant: boolean;
  }> {
    const [tokenACompliant, tokenBCompliant, pairCompliant] = await Promise.all([
      this.client.readContract({
        address: this.registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'isAssetCompliant',
        args: [tokenA],
      }),
      this.client.readContract({
        address: this.registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'isAssetCompliant',
        args: [tokenB],
      }),
      this.client.readContract({
        address: this.registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'areTokensCompliant',
        args: [tokenA, tokenB],
      }),
    ]);

    return {
      tokenACompliant: tokenACompliant as boolean,
      tokenBCompliant: tokenBCompliant as boolean,
      pairCompliant: pairCompliant as boolean,
    };
  }
}
