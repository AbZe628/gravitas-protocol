import { ChainId } from "../constants";
import { BaseAdapter } from "../adapters/BaseAdapter";
import { UniV2Adapter } from "../adapters/UniV2Adapter";
import { CamelotAdapter } from "../adapters/CamelotAdapter";
import { AdapterNotSupportedError } from "../errors";

// In a real production SDK, these addresses would come from a config file or subgraph
const REGISTRY: Record<number, Record<string, BaseAdapter>> = {
  [ChainId.ARBITRUM_SEPOLIA]: {
    "uniswap_v2": new UniV2Adapter("0x0000000000000000000000000000000000000000", [ChainId.ARBITRUM_SEPOLIA]),
    "camelot_v2": new CamelotAdapter("0x0000000000000000000000000000000000000000", [ChainId.ARBITRUM_SEPOLIA]),
  }
};

export function resolveAdapter(chainId: number, adapterId: string): BaseAdapter {
  const chainRegistry = REGISTRY[chainId];
  
  if (!chainRegistry || !chainRegistry[adapterId]) {
    throw new AdapterNotSupportedError(adapterId, chainId);
  }

  return chainRegistry[adapterId];
}
