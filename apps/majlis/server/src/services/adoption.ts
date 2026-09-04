/**
 * The library as each board holds it.
 *
 * Nineteen shapes ship as a draft. Until a board has done something with one,
 * its conditions are somebody else's reading — offered so a scholar stops
 * composing a question from an empty box, and binding on nobody. The file that
 * holds the library says so about itself, and until now that was the whole
 * story.
 *
 * Adoption is what changes it. The board takes a shape, amends what it
 * disagrees with, and thereafter the checklist runs against **their** version.
 *
 * ── the three rules ───────────────────────────────────────────────────────
 *
 * **One shape at a time.** No board approves nineteen contracts in a sitting.
 * They adopt the ones they use, and a system that made it all-or-nothing would
 * either be ignored or waved through — and waved through is worse, because it
 * would produce a record saying a board considered something it never read.
 *
 * **Always under a settled matter.** "As a matter like any other" is the whole
 * design. A decision of this board is named and is checked to have been
 * settled; one still being argued about is not enough. Without that, adoption
 * would be a switch anybody on the board could flip, and the library would
 * become binding by administration rather than by decision.
 *
 * **The conditions are copied, not referenced.** A board that adopted murabaha
 * in 2026 adopted the conditions as they read in 2026. If the shipped library
 * is revised afterwards, the board's version does not move under them — and
 * the difference between the two becomes visible instead of silent.
 *
 * ── append-only, like everything else in the record ───────────────────────
 *
 * An amendment supersedes an adoption rather than editing it, naming the one
 * it replaces and the matter that decided it. The earlier version stays,
 * because findings were recorded against it and a reader has to see what the
 * board was working from at the time.
 */

import { randomUUID } from 'node:crypto';
import { Refused } from './lifecycle.js';
import { structureById } from '../data/structures.js';
import type { AdoptedStructure, Matter, Structure, StructureCondition } from '../types.js';

export type AdoptionRefusal =
  | 'not_in_library'
  | 'no_matter'
  | 'matter_not_settled'
  | 'not_this_board'
  | 'no_reason_given'
  | 'no_conditions'
  | 'already_replaced'
  | 'no_such_prior';

function refuse(code: AdoptionRefusal, message: string): never {
  throw new Refused(code as never, message);
}

/**
 * A matter is settled when the board has finished with it.
 *
 * `in_force` is the ordinary case. A rejected or withdrawn matter is settled
 * too, and adopting under one would be recording that the board approved a
 * shape in the same breath as refusing something — so only a decision that
 * carried is accepted.
 */
const CARRIED = 'in_force';

export interface AdoptInput {
  structureId: string;
  boardId: string;
  standing: AdoptedStructure['standing'];
  matterId: string;
  /** Required on an amendment and on a decline: what changed, or why not. */
  amendments?: string[];
  /** Supplied only on an amendment. On a plain adoption the library's are copied. */
  conditions?: StructureCondition[];
  supersedes?: string | null;
}

const MIN_REASON = 20;

export function adopt(
  input: AdoptInput,
  matters: Matter[],
  existing: AdoptedStructure[],
  by: string,
  at: string,
): AdoptedStructure {
  const shape = structureById(input.structureId);
  if (!shape) {
    refuse(
      'not_in_library',
      `"${input.structureId}" is not a shape in the library. A board may amend what is there; ` +
        'writing a shape from nothing is a different piece of work.',
    );
  }

  // ── the decision behind it ──────────────────────────────────────────────

  const matter = matters.find((m) => m.id === input.matterId);
  if (!matter) {
    refuse(
      'no_matter',
      'Adoption names the decision it was made in, and there is no such matter. Without one this ' +
        'would be a switch rather than a decision.',
    );
  }
  if (matter.boardId !== input.boardId) {
    refuse('not_this_board', 'That matter belongs to another board.');
  }
  if (matter.status !== CARRIED) {
    refuse(
      'matter_not_settled',
      `That matter is ${matter.status.replace(/_/g, ' ')}. A shape is adopted under a decision ` +
        'that carried, not under one the board is still arguing about.',
    );
  }

  // ── what is being taken, and how ────────────────────────────────────────

  let conditions: StructureCondition[];
  const amendments = (input.amendments ?? []).map((a) => a.trim()).filter((a) => a !== '');

  if (input.standing === 'declined') {
    if (amendments.length === 0) {
      refuse(
        'no_reason_given',
        'Declining a shape needs the board’s reason. A shape that disappears from the picker ' +
          'without one leaves the next board wondering whether it was considered.',
      );
    }
    conditions = [];
  } else if (input.standing === 'amended') {
    if (amendments.length === 0) {
      refuse(
        'no_reason_given',
        'An amendment needs to say what changed and why. The difference between the board’s ' +
          'version and the shipped one is the part a reader is looking for.',
      );
    }
    if (!input.conditions || input.conditions.length === 0) {
      refuse(
        'no_conditions',
        'An amended shape needs its conditions. A shape with none is a heading, and a matter ' +
          'judged against it would show an empty checklist as though there were nothing to ask.',
      );
    }
    for (const c of input.conditions) {
      if ((c.why ?? '').trim().length < MIN_REASON) {
        refuse(
          'no_reason_given',
          `The condition "${c.id}" has no reason. A condition stated without one can only be ` +
            'accepted or refused on authority, and the board is the authority here.',
        );
      }
    }
    conditions = input.conditions;
  } else {
    // Copied, not referenced. A later revision of the shipped library must not
    // silently change what this board adopted.
    conditions = structuredClone(shape.conditions);
  }

  // ── replacing an earlier adoption ───────────────────────────────────────

  let supersedes: string | null = null;
  if (input.supersedes) {
    const prior = existing.find((a) => a.id === input.supersedes);
    if (!prior) refuse('no_such_prior', 'There is no such earlier adoption to replace.');
    if (prior.structureId !== input.structureId) {
      refuse(
        'no_such_prior',
        'That adoption is of a different shape. Each shape is taken, amended and reconsidered ' +
          'on its own.',
      );
    }
    const already = existing.find((a) => a.supersedes === prior.id);
    if (already) {
      refuse(
        'already_replaced',
        `That adoption has already been replaced, by ${already.id}. Replacing it twice would ` +
          'leave two versions each claiming to be the board’s.',
      );
    }
    supersedes = prior.id;
  }

  return {
    id: randomUUID(),
    boardId: input.boardId,
    structureId: input.structureId,
    standing: input.standing,
    conditions,
    amendments,
    matterId: input.matterId,
    decidedBy: by,
    decidedAt: at,
    supersedes,
  };
}

/** True where a later adoption names this one as the one it replaces. */
export function isReplaced(a: AdoptedStructure, all: AdoptedStructure[]): boolean {
  return all.some((other) => other.supersedes === a.id);
}

/** What each board currently holds. Derived by looking, never stored. */
export function standingAdoptions(all: AdoptedStructure[]): AdoptedStructure[] {
  return all.filter((a) => !isReplaced(a, all));
}

/**
 * Which version of a shape a matter is judged by, and where it came from.
 *
 * This is the sentence the whole file exists to make available: a checklist
 * built against the shipped draft is not the same thing as one built against
 * what the board adopted, and every surface that shows a checklist has to be
 * able to say which it is looking at.
 */
export interface Effective {
  structure: Structure;
  source: 'adopted' | 'amended' | 'draft';
  /** Null where the shape has not been adopted. */
  adoption: AdoptedStructure | null;
  /** True where the board considered this shape and ruled against using it. */
  declined: boolean;
  note: string;
}

export const AS_SHIPPED =
  'This is the shipped draft. This board has not adopted this shape, so its conditions are a ' +
  'starting point offered for the board to rule beside. They are binding on nobody, and nothing ' +
  'here treats them as the board’s own.';

export const AS_ADOPTED =
  'This is the board’s own version, taken under the decision named. The conditions were copied ' +
  'when it was adopted, so a later revision of the shipped library does not move them.';

export const AS_DECLINED =
  'This board considered this shape and ruled against using it. A matter judged against it is ' +
  'being judged against something the board has already declined.';

export function effectiveFor(
  structureId: string,
  boardId: string,
  all: AdoptedStructure[],
): Effective | null {
  const shipped = structureById(structureId);
  if (!shipped) return null;

  // The one nothing replaces. Ordering by time would be wrong rather than
  // merely imprecise: two adoptions recorded in the same second are ordered by
  // whichever the store happened to return first, and the board's current
  // version would depend on that. The supersession chain is exact.
  const mine = standingAdoptions(all).filter(
    (a) => a.boardId === boardId && a.structureId === structureId,
  );
  const current = mine[mine.length - 1] ?? null;

  if (!current) {
    return { structure: shipped, source: 'draft', adoption: null, declined: false, note: AS_SHIPPED };
  }

  if (current.standing === 'declined') {
    // The shipped conditions are still returned. A board judging a matter
    // against a shape it declined should see the shape and the fact that it
    // declined it, rather than an empty page that says nothing.
    return {
      structure: shipped,
      source: 'draft',
      adoption: current,
      declined: true,
      note: AS_DECLINED,
    };
  }

  return {
    structure: { ...shipped, conditions: current.conditions },
    source: current.standing,
    adoption: current,
    declined: false,
    note: AS_ADOPTED,
  };
}

/** The whole library as this board holds it, for a picker or a report. */
export function libraryFor(
  boardId: string,
  all: AdoptedStructure[],
  shapes: Structure[],
): Effective[] {
  return shapes
    .map((s) => effectiveFor(s.id, boardId, all))
    .filter((e): e is Effective => e !== null);
}

/**
 * The history of one shape for one board, oldest first.
 *
 * Replaced versions are kept. A board that amended a condition and later
 * amended it back should be able to see that it did, and the reasons it gave
 * each time.
 */
export function historyFor(
  structureId: string,
  boardId: string,
  all: AdoptedStructure[],
): { adoption: AdoptedStructure; replacedBy: string | null }[] {
  const mine = all.filter((a) => a.boardId === boardId && a.structureId === structureId);
  const replacedBy = (id: string) => mine.find((other) => other.supersedes === id) ?? null;

  // Ordered by the supersession chain rather than by time. Two adoptions
  // recorded in the same second cannot be told apart by their timestamps, and
  // a history that put an amendment before the thing it amended would be
  // reporting the board's reasoning backwards.
  const roots = mine.filter((a) => !a.supersedes || !mine.some((o) => o.id === a.supersedes));
  const ordered: AdoptedStructure[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    let node: AdoptedStructure | null = root;
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      ordered.push(node);
      node = replacedBy(node.id);
    }
  }
  // Anything a cycle or a broken link left out still appears, at the end,
  // rather than disappearing from a record that is meant to be complete.
  for (const a of mine) if (!seen.has(a.id)) ordered.push(a);

  return ordered.map((a) => ({ adoption: a, replacedBy: replacedBy(a.id)?.id ?? null }));
}
