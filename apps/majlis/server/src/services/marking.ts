/**
 * Conventional or tokenised, marked on the holding and on the ruling.
 *
 * ── what the handbook asks for ────────────────────────────────────────────
 *
 * > Where a bank holds tokenised assets, some rulings can additionally be
 * > enforced by contract: a transaction that would breach the ruling does not
 * > execute. The two can sit side by side in one bank. The distinction is
 * > marked on each holding and on each ruling, **not by running two different
 * > systems**.
 *
 * Until now the distinction was a property of the installation. A chain was
 * attached or it was not, and every ruling got the same sentence about how it
 * is carried out. That is wrong in the ordinary case: a bank with a registry
 * still holds conventional assets, and a ruling over one of those is carried
 * out by people in the bank exactly as it would be with no chain anywhere.
 * Telling its board that a contract refuses breaching transactions would be a
 * comfortable sentence and a false one.
 *
 * ── the four answers this produces ────────────────────────────────────────
 *
 * For any holding, and for any ruling over holdings: who carries it out, how
 * it is checked, when drift is found, and what is not covered. The handbook
 * sets those four out as a table with two columns, and this is that table with
 * the column chosen per holding rather than per installation.
 *
 * ── where no chain is attached ────────────────────────────────────────────
 *
 * None of it appears. Not hidden — there is nothing to distinguish. Every
 * holding is carried out by people, every ruling is a record, and a mark
 * saying so on every row would make the ordinary installation look like a
 * reduced one. `applies()` is the one question every screen asks first.
 *
 * ── and nothing here concludes ────────────────────────────────────────────
 *
 * Where the board has marked a holding, that is the answer. Where it has not,
 * a contract address in the register is read as one — and the reading is
 * reported as a reading, with the address it came from, so a board can see it
 * was never asked. What is never done is guessing from a name.
 */

import type { Asset, Matter } from '../types.js';
import type { EnforcementSnapshot } from './enforcement.js';

export type HeldAs = 'conventional' | 'tokenised';

/** Where the answer came from. The screen says which, because they differ. */
export type Basis =
  /** The board marked it. */
  | 'recorded'
  /** Not marked; the register carries a contract address, which is read as one. */
  | 'read from the register'
  /** Not marked and no address. Conventional as far as anything here knows. */
  | 'nothing says otherwise';

export interface Held {
  assetId: string;
  name: string;
  mark: HeldAs;
  basis: Basis;
  /** The address the reading came from, where that is the basis. */
  address?: string;
  network?: string;
}

/**
 * Whether the distinction applies to this installation at all.
 *
 * The first question every screen asks. With nothing attached there is one
 * kind of holding and one way of carrying a ruling out, and saying so on every
 * row is noise rather than information.
 */
export function applies(snapshot: EnforcementSnapshot): boolean {
  return snapshot.configured;
}

/** How this holding is held, and on what basis. */
export function heldAs(asset: Asset): Held {
  const onChain = (asset.identifiers ?? []).find((i) => i.scheme === 'chain');

  if (asset.heldAs) {
    return {
      assetId: asset.id,
      name: asset.name,
      mark: asset.heldAs,
      basis: 'recorded',
      ...(onChain ? { address: onChain.value, ...(onChain.network ? { network: onChain.network } : {}) } : {}),
    };
  }

  if (onChain) {
    return {
      assetId: asset.id,
      name: asset.name,
      mark: 'tokenised',
      basis: 'read from the register',
      address: onChain.value,
      ...(onChain.network ? { network: onChain.network } : {}),
    };
  }

  return {
    assetId: asset.id,
    name: asset.name,
    mark: 'conventional',
    basis: 'nothing says otherwise',
  };
}

/**
 * What carries out a ruling, holding by holding.
 *
 * A ruling over a mixture is the case worth building for: one ruling, three
 * tokenised holdings and two conventional ones, carried out two different ways
 * at the same time. A single answer for the whole ruling would have to be
 * either the optimistic one or the pessimistic one, and both are wrong about
 * half the holdings.
 */
export interface CarriedOut {
  matterId: string;
  /** Whether anything is attached at all. False makes everything below empty. */
  attached: boolean;
  /** Holdings a contract can refuse a breaching transaction on. */
  byContract: Held[];
  /** Holdings where people in the bank carry the ruling out. */
  byPeople: Held[];
  /**
   * True where the ruling names no holding at all.
   *
   * Common and not a fault: a ruling about a structure rather than about an
   * instrument names nothing in the register. Nothing enforces it and nothing
   * was ever going to; it is carried out by whoever writes the contracts.
   */
  namesNoHolding: boolean;
}

export function carriedOut(
  matter: Matter,
  holdings: readonly Asset[],
  snapshot: EnforcementSnapshot,
): CarriedOut {
  const named = matter.assetIds ?? [];
  const byId = new Map(holdings.map((a) => [a.id, a]));

  const reached = named
    .map((id) => byId.get(id))
    .filter((a): a is Asset => a !== undefined)
    .map(heldAs);

  if (!applies(snapshot)) {
    return {
      matterId: matter.id,
      attached: false,
      byContract: [],
      /*
       * Everything, including holdings that carry a contract address. The
       * address is real and the holding is on a chain; what is absent is
       * anything here reading that chain, so nothing in this installation
       * refuses a transaction and the ruling is carried out by people.
       */
      byPeople: reached,
      namesNoHolding: reached.length === 0,
    };
  }

  return {
    matterId: matter.id,
    attached: true,
    byContract: reached.filter((h) => h.mark === 'tokenised'),
    byPeople: reached.filter((h) => h.mark === 'conventional'),
    namesNoHolding: reached.length === 0,
  };
}

/**
 * The one sentence the ruling screen leads with.
 *
 * Composed from facts rather than chosen from a list of four, because the
 * mixed case is the one that matters and a fixed sentence cannot carry two
 * numbers. The client has its own wording in three languages; this is what the
 * printed document and an English reader get.
 */
export function inAWord(carried: CarriedOut): string {
  if (carried.namesNoHolding) {
    return (
      'This ruling names no holding in the register, so nothing here carries it out. It is ' +
      'carried out by the people who write and approve the contracts it governs.'
    );
  }

  if (!carried.attached) {
    return (
      'Nothing is attached to this installation, so this ruling is carried out by the ' +
      "institution's own process. That is the ordinary arrangement and not a missing piece."
    );
  }

  const contract = carried.byContract.length;
  const people = carried.byPeople.length;

  if (contract > 0 && people === 0) {
    return (
      `Every holding this ruling names is tokenised (${contract}), so a transaction that would ` +
      'breach it does not execute. It is still reviewed afterwards.'
    );
  }

  if (contract === 0) {
    return (
      `Every holding this ruling names is held conventionally (${people}), so it is carried out ` +
      'by people in the bank and checked at review, even though a registry is attached.'
    );
  }

  return (
    `This ruling is carried out two ways at once: ${contract} tokenised holding` +
    `${contract === 1 ? '' : 's'} where a breaching transaction is refused, and ${people} held ` +
    `conventionally where people in the bank carry it out and a review finds a breach ` +
    'afterwards.'
  );
}
