import { PublicClient, Address, parseAbi } from "viem";
import { ShariahViolationError } from "./types.js";

/**
 * @notice ABI for the GravitasPolicyRegistry contract.
 * @dev Synchronized with GravitasPolicyRegistry.sol (v1.0.0)
 */
const REGISTRY_ABI = parseAbi([
  "function isAssetCompliant(address asset) view returns (bool)",
  "function isRouterAuthorized(address router) view returns (bool)",
  "function areTokensCompliant(address tokenA, address tokenB) view returns (bool)",
]);

/**
 * @title ComplianceService
 * @notice Handles Shariah "Pre-Flight" checks by querying the on-chain Policy Registry.
 */
export class ComplianceService {
  constructor(
    private readonly publicClient: PublicClient,
    private readonly registryAddress: Address
  ) {}

  /**
   * @notice Validates if a pair of tokens is Shariah-compliant.
   * @throws {ShariahViolationError} If any token is non-compliant.
   * @param tokenA The address of the first token in the pair.
   * @param tokenB The address of the second token in the pair.
   */
  async validateTokens(tokenA: Address, tokenB: Address): Promise<void> {
    const isCompliant = await this.publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: "areTokensCompliant",
      args: [tokenA, tokenB],
    });

    if (!isCompliant) {
      throw new ShariahViolationError(
        `One or more assets in the pair [${tokenA}, ${tokenB}] are not Shariah-compliant.`
      );
    }
  }

  /**
   * @notice Validates if a router is authorized for institutional use.
   * @throws {ShariahViolationError} If the router is not authorized.
   * @param routerAddress The address of the DEX router to validate.
   */
  async validateRouter(routerAddress: Address): Promise<void> {
    const isAuthorized = await this.publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: "isRouterAuthorized",
      args: [routerAddress],
    });

    if (!isAuthorized) {
      throw new ShariahViolationError(
        `The target router [${routerAddress}] is not authorized by the Gravitas Policy Registry.`
      );
    }
  }
}
