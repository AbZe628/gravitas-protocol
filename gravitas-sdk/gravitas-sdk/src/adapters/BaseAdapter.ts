import { Interface } from "ethers";

export interface AdapterConfig {
  adapterId: string;
  routerAddress: string;
  supportedChains: number[];
}

/**
 * Abstract definition of a Protocol Adapter.
 * Adapters are STATELESS calculators. They do not query chain state directly
 * during calldata generation, ensuring determinism.
 */
export abstract class BaseAdapter {
  public readonly adapterId: string;
  public readonly routerAddress: string;
  protected readonly supportedChains: number[];

  constructor(config: AdapterConfig) {
    this.adapterId = config.adapterId;
    this.routerAddress = config.routerAddress;
    this.supportedChains = config.supportedChains;
  }

  /**
   * Validates if the adapter functions on the requested chain.
   */
  public supportsChain(chainId: number): boolean {
    return this.supportedChains.includes(chainId);
  }

  /**
   * Generates calldata for removing liquidity.
   */
  abstract buildRemoveLiquidityCalldata(
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: string,
    deadline: number
  ): string;

  /**
   * Generates calldata for adding liquidity.
   */
  abstract buildAddLiquidityCalldata(
    tokenA: string,
    tokenB: string,
    amountADesired: bigint,
    amountBDesired: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: string,
    deadline: number
  ): string;

  /**
   * Returns a simulated quote for LP value.
   * Note: In a production SDK, this would interface with a Quoter contract or 
   * static RPC call. For v0.1 simulation, we use reserve math.
   */
  abstract getQuote(
    liquidityAmount: bigint,
    reservesA: bigint,
    reservesB: bigint,
    totalSupply: bigint
  ): { amountA: bigint; amountB: bigint };
}
