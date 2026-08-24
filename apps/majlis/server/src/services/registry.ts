import { createPublicClient, http, type Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { RegistrySnapshot } from '../types.js';

/**
 * Read side of the deployed Policy Registry.
 *
 * The ABI below is deliberately minimal: Majlis asks the registry two things,
 * whether it is paused and who owns it, and has no business asking more.
 *
 * Both were checked against the deployed registry at
 * 0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23 on 24 August 2026 and answer with
 * the signatures given here. Anything added to this list must be checked the
 * same way — an assumed signature does not fail loudly, it returns a decoded
 * value that means nothing.
 *
 * Reads stay best-effort regardless: a failure is reported as a failure rather
 * than disguised, and the application continues to serve the recorded seed
 * data. It must never present an unverified chain read as though confirmed.
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
