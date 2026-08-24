import { useEffect, useState } from 'react';
import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { CONTRACTS } from './wagmi';

/**
 * What the protocol is actually doing, read from the chain.
 *
 * This replaces four figures that were written into the source: a total value
 * locked of $2.4M, 342 active users, 1,247 migrations, and a set of percentage
 * changes "vs last period". None of them came from anywhere. The protocol has
 * never held funds — the marketing page says so, in the same breath as the
 * dashboard was claiming millions — and a page that invents its own metrics is
 * worse than a page with none, because a reader has no way to tell which
 * numbers on it are real.
 *
 * Everything here is a real read, and where the honest answer is zero it says
 * zero. A testnet protocol with no migrations should look like a testnet
 * protocol with no migrations.
 */

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
});

const TELEPORTED = parseAbiItem(
  'event LiquidityTeleported(uint256 indexed oldTokenId, uint256 indexed newTokenId, address indexed user, uint128 newLiquidity, uint24 newFee, bool swapExecuted)',
);

const REGISTRY_ABI = [
  { name: 'getPolicyVersion', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;

const TELEPORT_ABI = [
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
] as const;

export interface Migration {
  hash: `0x${string}`;
  blockNumber: bigint;
  user: Address;
  oldTokenId: bigint;
  newTokenId: bigint;
  newFee: number;
  swapExecuted: boolean;
}

export interface ProtocolState {
  /** Null while loading, and on a read that failed — never a stand-in number. */
  policyVersion: bigint | null;
  registryPaused: boolean | null;
  teleportPaused: boolean | null;
  owner: Address | null;
  migrations: Migration[] | null;
  /** Distinct addresses that have migrated. Zero is a real answer. */
  uniqueUsers: number | null;
  loading: boolean;
  /** Set when the chain could not be reached, so the interface can say so. */
  unreachable: boolean;
}

const EMPTY: ProtocolState = {
  policyVersion: null,
  registryPaused: null,
  teleportPaused: null,
  owner: null,
  migrations: null,
  uniqueUsers: null,
  loading: true,
  unreachable: false,
};

export function useProtocolState(): ProtocolState {
  const [state, setState] = useState<ProtocolState>(EMPTY);

  useEffect(() => {
    let live = true;

    async function read() {
      try {
        const [version, registryPaused, owner, teleportPaused] = await Promise.all([
          client.readContract({ address: CONTRACTS.POLICY_REGISTRY, abi: REGISTRY_ABI, functionName: 'getPolicyVersion' }),
          client.readContract({ address: CONTRACTS.POLICY_REGISTRY, abi: REGISTRY_ABI, functionName: 'paused' }),
          client.readContract({ address: CONTRACTS.POLICY_REGISTRY, abi: REGISTRY_ABI, functionName: 'owner' }),
          client.readContract({ address: CONTRACTS.TELEPORT_V3, abi: TELEPORT_ABI, functionName: 'paused' }),
        ]);

        /*
         * The public RPC caps how far back logs can be fetched, so this is the
         * recent window rather than all history. It is labelled as such where
         * it is shown: a count presented as "all migrations" that is really
         * "migrations in the last N blocks" is the same class of lie as an
         * invented one, just smaller.
         */
        const latest = await client.getBlockNumber();
        // BigInt literals need a newer target than this project compiles to,
        // and changing that for one line is not worth it.
        const window = BigInt(90_000);
        const zero = BigInt(0);
        const from = latest > window ? latest - window : zero;

        const logs = await client.getLogs({
          address: CONTRACTS.TELEPORT_V3,
          event: TELEPORTED,
          fromBlock: from,
          toBlock: latest,
        });

        const migrations: Migration[] = logs.map((log) => ({
          hash: log.transactionHash,
          blockNumber: log.blockNumber,
          user: log.args.user as Address,
          oldTokenId: log.args.oldTokenId as bigint,
          newTokenId: log.args.newTokenId as bigint,
          newFee: Number(log.args.newFee),
          swapExecuted: Boolean(log.args.swapExecuted),
        }));

        if (!live) return;
        setState({
          policyVersion: version as bigint,
          registryPaused: registryPaused as boolean,
          teleportPaused: teleportPaused as boolean,
          owner: owner as Address,
          migrations,
          uniqueUsers: new Set(migrations.map((m) => m.user.toLowerCase())).size,
          loading: false,
          unreachable: false,
        });
      } catch {
        // Unreachable is a state to report, not a reason to show a number that
        // was never read.
        if (live) setState({ ...EMPTY, loading: false, unreachable: true });
      }
    }

    void read();
    return () => {
      live = false;
    };
  }, []);

  return state;
}

export const explorer = {
  address: (a: string) => `https://sepolia.arbiscan.io/address/${a}`,
  tx: (h: string) => `https://sepolia.arbiscan.io/tx/${h}`,
};

/** Shortened for display, with the full value still available to copy. */
export function short(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
