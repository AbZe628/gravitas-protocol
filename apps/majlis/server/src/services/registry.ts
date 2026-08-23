import { createPublicClient, http, type Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { RegistrySnapshot } from '../types.js';

/**
 * Read side of the deployed Policy Registry.
 *
 * IMPORTANT — the ABI below is a minimal assumed interface. It has NOT been
 * verified against the deployed contract. Before this is relied on for
 * anything, replace it with the ABI emitted by the actual build and confirm
 * each function exists with the signature given here.
 *
 * Until that is done, every read is treated as best-effort: a failure is
 * reported as a failure rather than being disguised, and the application
 * continues to serve the recorded seed data. The application must never
 * present an unverified chain read as though it were confirmed.
 */
export const POLICY_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

export interface RegistryConfig {
  rpcUrl: string;
  address: string;
  offline: boolean;
}

export function configFromEnv(): RegistryConfig {
  return {
    rpcUrl: process.env.RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc',
    address:
      process.env.POLICY_REGISTRY_ADDRESS ??
      '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23',
    offline: (process.env.OFFLINE_MODE ?? 'false').toLowerCase() === 'true',
  };
}

export async function readRegistry(cfg: RegistryConfig): Promise<RegistrySnapshot> {
  const base: RegistrySnapshot = {
    address: cfg.address,
    chainId: arbitrumSepolia.id,
    readAt: new Date().toISOString(),
    reachable: false,
  };

  if (cfg.offline) {
    return { ...base, error: 'offline mode: chain not contacted' };
  }

  try {
    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(cfg.rpcUrl, { timeout: 8000 }),
    });

    const address = cfg.address as Address;

    const [paused, owner] = await Promise.all([
      client.readContract({ address, abi: POLICY_REGISTRY_ABI, functionName: 'paused' }),
      client.readContract({ address, abi: POLICY_REGISTRY_ABI, functionName: 'owner' }),
    ]);

    return {
      ...base,
      reachable: true,
      paused: paused as boolean,
      owner: owner as string,
    };
  } catch (err) {
    return {
      ...base,
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
