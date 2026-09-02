import { readRegistry, configFromEnv, type RegistryConfig } from './registry.js';

/**
 * What, if anything, carries out what the board decides.
 *
 * **Majlis is a stand-alone product.** A Shariah board inside a conventional
 * bank — approving products, screening assets, ruling on structures — has the
 * same problem and no chain anywhere near it, and that board is the larger
 * market. Gravitas is one consumer of this application rather than its purpose.
 *
 * So enforcement is an adapter and its default is nothing. The record, the
 * deliberation, the evidence, the terms, the voting and the export all work
 * with no enforcement configured at all, and a bank that leaves it off is not
 * running a degraded installation — it is running the ordinary one.
 *
 * Nothing here ever *performs* enforcement. Majlis records a decision; it does
 * not execute it. What an adapter does is report what the enforcing system
 * currently says, so a board can see whether what runs matches what it
 * approved. Stage Three is where the vote becomes the signature.
 */

export type EnforcementKind = 'none' | 'gravitas-registry';

export interface EnforcementSnapshot {
  kind: EnforcementKind;
  /** False when nothing is attached. Not an error, and not a degraded state. */
  configured: boolean;
  readAt: string;

  /** Everything below is present only when something is attached. */
  label?: string;
  reachable?: boolean;
  paused?: boolean;
  owner?: string;
  address?: string;
  chainId?: number;
  /** Why a read failed, in the words the underlying system used. */
  error?: string;
}

export interface Enforcement {
  readonly kind: EnforcementKind;
  snapshot(): Promise<EnforcementSnapshot>;
}

/**
 * The default. Decisions are recorded here and carried out by whatever the
 * institution already uses, which this application does not need to know about.
 */
export class NoEnforcement implements Enforcement {
  readonly kind = 'none' as const;

  async snapshot(): Promise<EnforcementSnapshot> {
    return { kind: 'none', configured: false, readAt: new Date().toISOString() };
  }
}

/** The Gravitas Policy Registry on Arbitrum, read through viem. */
export class GravitasRegistryEnforcement implements Enforcement {
  readonly kind = 'gravitas-registry' as const;

  constructor(private readonly cfg: RegistryConfig) {}

  async snapshot(): Promise<EnforcementSnapshot> {
    const read = await readRegistry(this.cfg);
    return {
      kind: this.kind,
      configured: true,
      label: 'Gravitas Policy Registry',
      readAt: read.readAt,
      reachable: read.reachable,
      paused: read.paused,
      owner: read.owner,
      address: read.address,
      chainId: read.chainId,
      error: read.error,
    };
  }
}

/**
 * Chosen explicitly by `MAJLIS_ENFORCEMENT`, or inferred from the configuration
 * that is already there.
 *
 * The inference exists so that an installation configured before this adapter
 * did not silently lose its chain read on upgrade. A fresh installation, with
 * no registry address anywhere, gets nothing — which is the point.
 */
export function enforcementFromEnv(): Enforcement {
  const chosen = process.env.MAJLIS_ENFORCEMENT?.trim().toLowerCase();

  if (chosen === 'none') return new NoEnforcement();
  if (chosen === 'gravitas-registry') return new GravitasRegistryEnforcement(configFromEnv());

  if (chosen) {
    throw new Error(
      `MAJLIS_ENFORCEMENT is "${chosen}", which is not one of: none, gravitas-registry. ` +
        'Leaving it unset attaches nothing, which is the default and is a complete installation.',
    );
  }

  return process.env.POLICY_REGISTRY_ADDRESS?.trim()
    ? new GravitasRegistryEnforcement(configFromEnv())
    : new NoEnforcement();
}
