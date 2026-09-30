/**
 * Comparing what was executed against what the board approved.
 *
 * ── the gap this closes ───────────────────────────────────────────────────
 *
 * A Shariah board approves a structure. The institution then executes several
 * hundred transactions that are meant to be that structure. The commonest way
 * compliance actually fails is not a bad ruling — it is the distance between
 * the two, found years later or not at all.
 *
 * Majlis held the ruling, the conditions the board judged it against, and the
 * operative terms it set. It did not hold the comparison, and the annual report
 * said so in as many words: *the findings of the institution's own Shariah
 * review and Shariah audit functions are not held here.* A gap named in a
 * document is better than one hidden, and worse than one closed.
 *
 * ── what this does not do, which is most of it ────────────────────────────
 *
 * **It does not choose the sample.** Which transactions were examined, and on
 * what basis, is recorded in the examiner's words and is never generated.
 * Choosing the sample is most of what an audit is, and a system that chose it
 * would be conducting the audit while appearing to hold it.
 *
 * **It does not conclude.** Nothing here returns compliant, passed or failed.
 * Exceptions are counted and described. Whether four exceptions in fifty make
 * an arrangement impermissible is a ruling, raised as a matter like any other.
 *
 * **It does not compute coverage it cannot know.** Where the institution did
 * not say how many transactions there were, coverage is unknown and is printed
 * as unknown. A denominator nobody supplied would turn a sample of twelve into
 * a reassuring percentage of nothing.
 */

import { Refused } from './lifecycle.js';
import { structureById } from '../data/structures.js';
import type {
  AdoptedStructure,
  Examination,
  ExaminationFinding,
  Matter,
  StructureCondition,
} from '../types.js';

/** An exception nobody described is a number, and a number is not a finding. */
export const MIN_NOTE = 15;

/** The examiner has to say how they chose. It is most of what the work is. */
export const MIN_HOW_CHOSEN = 15;

/** The prefix that marks a finding against an operative term rather than a condition. */
export const TERM = 'term:';

/**
 * What a finding was recorded against, in the board's own words.
 *
 * ── two readers of one field, and never both right ────────────────────────
 *
 * A finding stores what it is against: a condition's id, or `term:<key>` for
 * an operative term. `record` enforces that shape and `/matters/:id/examinable`
 * hands the form exactly those values, so every examination the application
 * itself can produce carries the prefix.
 *
 * Two places read the field and they disagreed about it. The one that turns it
 * into a sentence looked the key up **without** the prefix; the one that works
 * out what was not examined looked it up **with** it. So no examination could
 * be right in both: the seeded ones, written bare, printed the sentence and
 * then named the two terms they had just reported findings on as *not
 * examined*; the ones the application records, written with the prefix, count
 * correctly and print `minTangibleRatioBps` where the board's own sentence
 * belongs — on a screen whose whole purpose is that the board reads what it
 * wrote rather than what a developer called it.
 *
 * Found by recording one through the application and reading it beside a
 * seeded one, two cards apart on the same screen.
 *
 * There is one resolver now, and `notExamined` is written against it, so the
 * two cannot drift apart again. It is deliberately not tolerant of the bare
 * form: a reader that accepted both is what let the disagreement live.
 */
export function inWords(
  against: string,
  terms: readonly { key: string; meaning: string }[],
  conditions: readonly Pick<StructureCondition, 'id' | 'requirement'>[],
): string | null {
  if (against.startsWith(TERM)) {
    const key = against.slice(TERM.length);
    return terms.find((p) => p.key === key)?.meaning ?? null;
  }
  return conditions.find((c) => c.id === against)?.requirement ?? null;
}

export interface Coverage {
  examined: number;
  /** Null where the institution did not say how many there were. */
  population: number | null;
  /** Null for the same reason. Never inferred from the sample. */
  percent: string | null;
}

export function coverageOf(examination: Examination): Coverage {
  const { examined, population } = examination;
  if (population === null || population <= 0) {
    return { examined, population: null, percent: null };
  }
  return {
    examined,
    population,
    percent: ((examined / population) * 100).toFixed(1),
  };
}

/** Every exception found, across the whole examination. */
export function exceptionsIn(examination: Examination): number {
  return examination.findings.reduce((n, f) => n + f.exceptions, 0);
}

/**
 * What the examination did not look at.
 *
 * Derived from the shape rather than stored, so a condition added to a board's
 * adopted shape after an examination shows up as unexamined instead of being
 * quietly absent. An examination that covered four of nine conditions and said
 * nothing about the other five would read as a clean result.
 */
export function notExamined(
  examination: Examination,
  conditions: StructureCondition[],
  terms: readonly { key: string; meaning: string }[],
): string[] {
  const answered = looked(examination);

  const missing: string[] = [];
  for (const c of conditions) if (!answered.has(c.id)) missing.push(c.requirement);
  /*
   * The term's meaning, not its key.
   *
   * This listed `minTangibleRatioBps` among the sentences, so the one place
   * that tells a board what an examination did not reach named half of it in
   * the board's words and half in the machine's.
   */
  for (const p of terms) if (!answered.has(TERM + p.key)) missing.push(p.meaning);
  return missing;
}

/**
 * What an examination actually reached.
 *
 * `not_examined` is a finding that says nothing was looked at, so it does not
 * count as having looked — which is the whole reason the field has three values
 * and not two.
 */
export function looked(examination: Examination): Set<string> {
  return new Set(
    examination.findings.filter((f) => f.held !== 'not_examined').map((f) => f.against),
  );
}

export interface RecordInput {
  from: string;
  to: string;
  howChosen: string;
  population: number | null;
  examined: number;
  findings: ExaminationFinding[];
}

/**
 * Record one examination against a settled ruling.
 *
 * Refuses an examination of a matter the board has not decided: there is
 * nothing to compare against until there is a ruling, and an examination filed
 * against an open question would be testing transactions against a proposal.
 */
export function record(
  id: string,
  matter: Matter,
  by: string,
  now: string,
  input: RecordInput,
  adoption: AdoptedStructure | null = null,
): Examination {
  if (matter.status !== 'in_force' && matter.status !== 'timelock') {
    throw new Refused(
      'wrong_status',
      `This matter is in ${matter.status}. An examination compares what was executed against a ` +
        'ruling, and there is no ruling to compare against until the board has decided.',
    );
  }

  if (input.howChosen.trim().length < MIN_HOW_CHOSEN) {
    throw new Refused(
      'no_basis_for_sample',
      'Say how the transactions were chosen. Which ones were looked at, and why those, is most of ' +
        'what an examination is, and a sample nobody can account for cannot be relied on later.',
    );
  }

  if (!Number.isInteger(input.examined) || input.examined < 1) {
    throw new Refused(
      'nothing_examined',
      'An examination that looked at nothing is not an examination. Record how many transactions ' +
        'were actually examined.',
    );
  }

  if (input.population !== null && input.population < input.examined) {
    throw new Refused(
      'more_examined_than_exist',
      'More transactions were examined than the period is said to contain. One of the two figures ' +
        'is wrong, and coverage computed from them would be worse than none.',
    );
  }

  for (const f of input.findings) {
    if (f.exceptions < 0 || !Number.isInteger(f.exceptions)) {
      throw new Refused('bad_exception_count', 'An exception count is a whole number, or none.');
    }

    if (f.exceptions > input.examined) {
      throw new Refused(
        'more_exceptions_than_examined',
        'More exceptions were found against one condition than transactions were examined.',
      );
    }

    /*
     * The note is compulsory wherever something was found. An exception with a
     * count and no description tells the board that something is wrong and
     * nothing about what — which is the least useful thing an audit can say,
     * and the hardest to act on a year later.
     */
    if (f.held === 'exceptions' && f.note.trim().length < MIN_NOTE) {
      throw new Refused(
        'no_finding_note',
        `An exception needs describing in at least ${MIN_NOTE} characters. A count with no ` +
          'description tells the board something is wrong and nothing about what.',
      );
    }

    if (f.held === 'exceptions' && f.exceptions < 1) {
      throw new Refused(
        'exceptions_without_a_count',
        'This says exceptions were found and counts none. Record how many.',
      );
    }

    if (f.held === 'held' && f.exceptions > 0) {
      throw new Refused(
        'held_with_exceptions',
        'This says the condition held and counts exceptions against it. One of the two is wrong, ' +
          'and the board will read the word rather than the number.',
      );
    }
  }

  if (Date.parse(input.from) > Date.parse(input.to)) {
    throw new Refused('backwards_period', 'The period examined starts after it ends.');
  }

  const shipped = matter.structureId ? structureById(matter.structureId) : undefined;
  const conditions =
    adoption && adoption.conditions.length > 0 ? adoption.conditions : (shipped?.conditions ?? []);
  const known = new Set<string>([
    ...conditions.map((c) => c.id),
    ...matter.proposedRule.parameters.map((p) => TERM + p.key),
  ]);

  for (const f of input.findings) {
    if (!known.has(f.against)) {
      throw new Refused(
        'not_in_this_ruling',
        `Nothing in this ruling is called ${f.against}. An examination is against the conditions ` +
          'and terms the board actually set.',
      );
    }
  }

  return {
    id,
    boardId: matter.boardId,
    matterId: matter.id,
    ruleId: matter.proposedRule.id,
    /*
     * The terms as they stood. An examination against terms the board has since
     * amended is an examination against the older ones, and saying so is what
     * stops it being read as evidence about the current rule.
     */
    parameterHash: matter.proposedRule.parameterHash,
    from: input.from,
    to: input.to,
    howChosen: input.howChosen.trim(),
    population: input.population,
    examined: input.examined,
    examinedBy: by,
    recordedAt: now,
    findings: input.findings.map((f) => ({ ...f, note: f.note.trim() })),
  };
}

/**
 * The examinations covering a period, newest first.
 *
 * Used by the annual report, which stops naming the Shariah audit as a gap once
 * a board actually has one for the year — the same conditional treatment
 * meetings get, and for the same reason: a gap that outlives its cause teaches
 * a board to stop reading the gaps.
 */
export function coveringYear(all: Examination[], year: number): Examination[] {
  return all
    .filter((e) => new Date(e.to).getUTCFullYear() === year)
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
}
