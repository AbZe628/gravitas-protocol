import { PublicClient, Address, parseAbi } from 'viem';
import { ShariahViolationError } from './types.js';

const REGISTRY_ABI = parseAbi([
  'function isAssetCompliant(address asset) view returns (bool)',
  'function isRouterAuthorized(address router) view returns (bool)',
  'function areTokensCompliant(address tokenA, address tokenB) view returns (bool)',
]);

/**
 * @title ComplianceService
 * @notice Handles Shariah "Pre-Flight" checks by querying the on-chain Policy Registry.
 */
export class ComplianceService {
  constructor(
    private client: PublicClient,
    private registryAddress: Address
  ) {}

  /**
   * @notice Validates if a pair of tokens is Shariah-compliant.
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
      throw new ShariahViolationError(`One or more assets in the pair [${tokenA}, ${tokenB}] are not Shariah-compliant.`);
    }
  }

  /**
   * @notice Validates if a router is authorized for institutional use.
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
      throw new ShariahViolationError(`The target router [${router}] is not authorized by the Gravitas Policy Registry.`);
    }
  }
}
