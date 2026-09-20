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

/**
 * Addresses that are no longer the protocol's, and why that is dangerous.
 *
 * ── the failure this prevents ─────────────────────────────────────────────
 *
 * A superseded contract is not gone. It sits on the chain answering
 * `paused()` and `owner()` exactly as it always did, with the state it had
 * the day it was replaced. Point Majlis at one and every read succeeds:
 * `reachable: true`, no error, a green screen — reporting the enforcement
 * state of a registry that enforces nothing.
 *
 * That is the worst shape a fault can take here. A board would be shown that
 * what runs matches what it approved, on evidence from a dead contract, and
 * nothing anywhere would say otherwise.
 *
 * So it is refused before a single read, by address, and the refusal names
 * the replacement. `docs/DEPLOYMENTS.md` is where these come from and is the
 * only place they are decided.
 */
export const SUPERSEDED: Readonly<Record<string, string>> = {
  /* GravitasPolicyRegistry 0.1.0 → the 0.2.0 registry. */
  '0xbcae3069362b0f0b80f44139052f159456c84679': 'GravitasPolicyRegistry 0.1.0',
  /* TeleportV3 0.1.0. Not a registry at all, and it would decode as nonsense. */
  '0x5d423f8d01539b92d3f3953b91682d9884d1e993': 'TeleportV3 0.1.0',
};

export const CURRENT_REGISTRY = '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23';

/** What this address is, if it is one Majlis must not read. */
export function supersededAs(address: string): string | null {
  return SUPERSEDED[address.trim().toLowerCase()] ?? null;
}

export async function readRegistry(cfg: RegistryConfig): Promise<RegistrySnapshot> {
  const base: RegistrySnapshot = {
    address: cfg.address,
    chainId: arbitrumSepolia.id,
    readAt: new Date().toISOString(),
    reachable: false,
  };

  /*
   * Refused before the read, not after.
   *
   * Reading it first and then deciding would mean holding, for a moment, a
   * successful answer from the wrong contract — and every such moment is one
   * where somebody adds a line that reports it.
   */
  const stale = supersededAs(cfg.address);
  if (stale) {
    return {
      ...base,
      superseded: true,
      error:
        `This is ${stale}, which was replaced and is not the protocol's registry. ` +
        `It still answers, which is why it is refused here rather than read: ` +
        `an answer from it would describe a contract that enforces nothing. ` +
        `The current registry is ${CURRENT_REGISTRY}.`,
    };
  }

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
