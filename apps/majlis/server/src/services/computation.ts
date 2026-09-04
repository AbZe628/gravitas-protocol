/**
 * Recording a calculation against a period.
 *
 * The four calculations compute statelessly, and that was right: the figures
 * belong to the institution, and a system holding them would be asserting
 * numbers it cannot audit. But it left the annual report unable to state zakat,
 * the calendar unable to carry a hawl, and a scholar unable to point at what
 * the board was shown last quarter. Four working calculators nobody can cite
 * are four calculators that do not appear in the year's evidence.
 *
 * ── the line this file holds ──────────────────────────────────────────────
 *
 * **Recording is not approving.** A computation is a fact — this arithmetic
 * follows from those figures. Whether the method was the right one is a ruling,
 * and a ruling goes through the ordinary process with a vote at the end of it.
 * Nothing here, and nothing built on it, may say the board agreed with what it
 * noted. `noted` is the word used throughout for that reason.
 *
 * **The figures are held, never asserted.** The same line the record already
 * takes with evidence: a source is kept with its citation and never restated as
 * this system's own. What is recorded is that the board was shown these
 * figures, from this named source, on this date.
 *
 * **Append-only.** A corrected figure does not edit a record. It produces a new
 * one naming the old, and the old one stays, because somebody may have acted on
 * it. Which are superseded is derived by looking rather than stored, so the two
 * can never disagree — the same rule the register and the manual follow.
 */

import { randomUUID } from 'node:crypto';
import { Refused } from './lifecycle.js';
import type { CalculationKind, Computation } from '../types.js';

/** What a caller sends to record one. The result comes from the calculation. */
export interface RecordInput {
  kind: CalculationKind;
  boardId: string;
  assetId?: string | null;
  periodFrom: string;
  periodTo: string;
  method: string;
  methodStated: string;
  currency: string;
  source: string;
  figures: Record<string, string | number | boolean | null>;
  headline: string;
  amount: string;
  steps: { label: string; working: string; value: string }[];
  note: string;
  /** The computation this replaces, where it replaces one. */
  supersedes?: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Its own codes, like the incident service.
 *
 * Refusing with a code that already means something else would make an
 * interface's job harder rather than easier: `wrong_status` is about a matter's
 * place in the process, and none of these are.
 */
export type ComputationRefusal =
  | 'no_period'
  | 'no_source'
  | 'no_steps'
  | 'no_such_prior'
  | 'wrong_kind'
  | 'different_holding'
  | 'already_withdrawn'
  | 'already_replaced';

function refuse(code: ComputationRefusal, message: string): never {
  throw new Refused(code as never, message);
}

function requireText(
  value: string | undefined,
  code: ComputationRefusal,
  field: string,
  why: string,
): string {
  const text = (value ?? '').trim();
  if (text === '') refuse(code, `${field} is missing. ${why}`);
  return text;
}

/**
 * Everything that must be true before a figure joins the record.
 *
 * A computation that cannot be found later is not a record, so the period is
 * required and is checked for order. A computation with no source is a set of
 * numbers somebody typed, which is the sentence the calculations themselves
 * use, and it would be a strange thing to relax at the moment of writing it
 * down.
 */
export function buildComputation(
  input: RecordInput,
  by: string,
  at: string,
  existing: Computation[],
): Computation {
  const periodFrom = requireText(
    input.periodFrom,
    'no_period',
    'The period this covers',
    'A computation with no period cannot be compared with the one before it, or found when the annual report asks for the year.',
  );
  const periodTo = requireText(
    input.periodTo,
    'no_period',
    'The period this covers',
    'It needs both ends.',
  );

  if (!ISO_DATE.test(periodFrom) || !ISO_DATE.test(periodTo)) {
    refuse('no_period', 'The period must be given as dates, so one year can be told from another.');
  }
  if (periodTo < periodFrom) {
    refuse('no_period', 'The period ends before it begins.');
  }

  const source = requireText(
    input.source,
    'no_source',
    'The source of the figures',
    'A figure with no source is one somebody typed, and this one is going into the record.',
  );

  if (input.amount === undefined || input.steps === undefined || input.steps.length === 0) {
    refuse(
      'no_steps',
      'A figure is not recorded without the sums that produced it. An amount on its own is ' +
        'something a board is asked to accept rather than something it can check.',
    );
  }

  let supersedes: string | null = null;
  if (input.supersedes) {
    const prior = existing.find((c) => c.id === input.supersedes);
    if (!prior) {
      refuse('no_such_prior', 'There is no such earlier computation to replace.');
    }
    if (prior.kind !== input.kind) {
      refuse(
        'wrong_kind',
        `A ${input.kind} computation cannot replace a ${prior.kind} one. They answer different questions.`,
      );
    }
    if ((prior.assetId ?? null) !== (input.assetId ?? null)) {
      refuse(
        'different_holding',
        'That computation is about a different holding. One about the wrong holding is withdrawn, ' +
          'not replaced — a replacement would claim the two are the same thing.',
      );
    }
    if (prior.withdrawnAt) {
      refuse(
        'already_withdrawn',
        'That computation was withdrawn. Record this one on its own rather than as its replacement.',
      );
    }
    const alreadyReplaced = existing.find((c) => c.supersedes === prior.id && !c.withdrawnAt);
    if (alreadyReplaced) {
      refuse(
        'already_replaced',
        `That computation has already been replaced, by ${alreadyReplaced.id}. Replacing it twice ` +
          'would leave two records each claiming to be the current one.',
      );
    }
    supersedes = prior.id;
  }

  return {
    id: randomUUID(),
    kind: input.kind,
    boardId: input.boardId,
    assetId: input.assetId ?? null,
    periodFrom,
    periodTo,
    method: input.method,
    methodStated: input.methodStated,
    currency: input.currency,
    source,
    figures: input.figures ?? {},
    headline: input.headline,
    amount: input.amount,
    steps: input.steps,
    note: input.note,
    recordedBy: by,
    recordedAt: at,
    supersedes,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawalReason: null,
  };
}

/** True where a later computation names this one as the one it replaces. */
export function isSuperseded(c: Computation, all: Computation[]): boolean {
  return all.some((other) => other.supersedes === c.id && !other.withdrawnAt);
}

/**
 * What stands: not withdrawn, and not replaced by anything.
 *
 * Derived every time rather than stored, so a record cannot be superseded in
 * one place and current in another.
 */
export function standing(all: Computation[]): Computation[] {
  return all.filter((c) => !c.withdrawnAt && !isSuperseded(c, all));
}

/**
 * The one a reader should be looking at, for a kind and a holding.
 *
 * Latest by the period it covers, then by when it was recorded — a computation
 * for December recorded in January is still December's.
 */
export function currentFor(
  all: Computation[],
  kind: CalculationKind,
  assetId: string | null = null,
): Computation | null {
  const mine = standing(all)
    .filter((c) => c.kind === kind && (c.assetId ?? null) === assetId)
    .sort((a, b) =>
      a.periodTo === b.periodTo
        ? a.recordedAt.localeCompare(b.recordedAt)
        : a.periodTo.localeCompare(b.periodTo),
    );
  return mine[mine.length - 1] ?? null;
}

/**
 * Everything standing that covers a year, for the annual report.
 *
 * A computation belongs to the year its period ends in. A quarter running from
 * October to December belongs to that year; one running December to February
 * belongs to the year it closed in, which is the year the board reported on it.
 */
export function forYear(all: Computation[], year: number, kind?: CalculationKind): Computation[] {
  return standing(all)
    .filter((c) => Number(c.periodTo.slice(0, 4)) === year)
    .filter((c) => kind === undefined || c.kind === kind)
    .sort((a, b) => a.periodTo.localeCompare(b.periodTo));
}

/**
 * The history of one thing, oldest first, with what happened to each.
 *
 * Superseded and withdrawn records are included rather than filtered out. A
 * board that revised a figure twice should see that it did; a list that showed
 * only the survivor would hide the revision, which is the part worth reading.
 */
export interface HistoryEntry {
  computation: Computation;
  state: 'standing' | 'superseded' | 'withdrawn';
  /** The computation that replaced this one, where one did. */
  replacedBy: string | null;
}

export function history(all: Computation[]): HistoryEntry[] {
  return [...all]
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .map((c) => {
      const replacement = all.find((other) => other.supersedes === c.id && !other.withdrawnAt);
      return {
        computation: c,
        state: c.withdrawnAt ? ('withdrawn' as const) : replacement ? ('superseded' as const) : ('standing' as const),
        replacedBy: replacement?.id ?? null,
      };
    });
}

/**
 * The sentence that travels with every recorded computation.
 *
 * Carried from here rather than written at each surface, so nothing can soften
 * it into an approval on the way past.
 */
export const WHAT_RECORDING_MEANS =
  'This records that the board was shown these figures, from the source named, and that this ' +
  'arithmetic follows from them. It is not a finding that the figures are correct, and it is ' +
  'not approval of the method — that is a ruling, and it is made in the ordinary way.';
