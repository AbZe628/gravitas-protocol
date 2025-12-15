import { BaseAdapter } from "./BaseAdapter";
import { Interface } from "ethers";

// Camelot V2 roughly follows UniV2 interfaces but is distinct deployment
const CAMELOT_ROUTER_ABI = [
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)"
];

export class CamelotAdapter extends BaseAdapter {
  private iface = new Interface(CAMELOT_ROUTER_ABI);

  constructor(routerAddress: string, supportedChains: number[]) {
    super({
      adapterId: "camelot_v2",
      routerAddress,
      supportedChains
    });
  }

  buildRemoveLiquidityCalldata(
    tokenA: string, tokenB: string, liquidity: bigint, 
    amountAMin: bigint, amountBMin: bigint, to: string, deadline: number
  ): string {
    return this.iface.encodeFunctionData("removeLiquidity", [
      tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline
    ]);
  }

  buildAddLiquidityCalldata(
    tokenA: string, tokenB: string, amountADesired: bigint, 
    amountBDesired: bigint, amountAMin: bigint, amountBMin: bigint, 
    to: string, deadline: number
  ): string {
    return this.iface.encodeFunctionData("addLiquidity", [
      tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline
    ]);
  }

  getQuote(liquidityAmount: bigint, reservesA: bigint, reservesB: bigint, totalSupply: bigint): { amountA: bigint; amountB: bigint } {
    if (totalSupply === 0n) return { amountA: 0n, amountB: 0n };
    
    // Camelot logic is identical for standard pools, but distinct for stable pools.
    // v0.1 assumes standard pool behavior.
    const amountA = (liquidityAmount * reservesA) / totalSupply;
    const amountB = (liquidityAmount * reservesB) / totalSupply;
    
    return { amountA, amountB };
  }
}
