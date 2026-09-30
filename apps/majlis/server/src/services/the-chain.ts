/**
 * From the ruling to the evidence, in one reading.
 *
 * ── the chain was broken in two places ────────────────────────────────────
 *
 * The thing this application is for is a line: the board rules, the ruling
 * sets a condition, the condition is something the institution has to do, the
 * institution's own review looks at whether it did, and the board reads what
 * was found. Every part of that existed and no part of it joined up. Rulings
 * were on one screen, the register on a second, examinations on a third — and
 * the examinations read as bolted on because they were.
 *
 * The first break closed when a ruling the board carried began reaching the
 * register at all. This closes the second: a ruling now carries what was
 * looked at against it and what was found, condition by condition and term by
 * term.
 *
 * ── what a board could not see before this ────────────────────────────────
 *
 * Open the pool ruling. It answers the six questions — what was decided, how
 * it is measured, whether it moves, when it is checked, what happens if it
 * fails, who is told. All mechanism, all correct, and not one word about the
 * fact that it **did** fail: three transfers executed at 50.4% in June, found
 * by an examination, recorded in the record, and invisible on the page for the
 * rule they breached. The page said *this stands, nothing is waiting on the
 * board* over it.
 *
 * ── it counts; it does not conclude ───────────────────────────────────────
 *
 * Nothing here returns compliant, passed, failed or a score. Exceptions are
 * counted and the examiner's words are carried; whether four exceptions in
 * eighty make an arrangement impermissible is a ruling, and is raised as a
 * matter like any other.
 *
 * ── and never examined is the answer it exists to give ────────────────────
 *
 * The valuable half is the silence. A board reading *two of these have been
 * looked at, six never have* is being told something no green screen ever
 * tells it. So a condition nobody has examined is a row like the others, with
 * nothing in it, rather than a row that is absent.
 */

import { TERM, looked } from './examination.js';
import type { Examination, Matter, Rule, RuleParameter, StructureCondition } from '../types.js';

/** What one examination found about one condition or term. */
export interface Looked {
  examinationId: string;
  /** The period the examiner defined, as they defined it. */
  from: string;
  to: string;
  recordedAt: string;
  /** `not_examined` never reaches here: it is not a look. */
  held: 'held' | 'exceptions';
  exceptions: number;
  /** The examiner's words. Never generated and never summarised. */
  note: string;
  /**
   * Whether the terms were the ones that stand today.
   *
   * An examination against terms the board has since amended is evidence about
   * the older ones, and a board reading a clean finding against a rule that has
   * moved is reading about a rule that is gone.
   */
  againstTheseTerms: boolean;
}

/** One thing the ruling asks, and everything the record holds about it. */
export interface Link {
  /** What a finding is recorded against: a condition id, or `term:<key>`. */
  against: string;
  kind: 'condition' | 'term';
  /** What is asked, in the board's own words. Never this file's. */
  asks: string;
  /** Why it is asked. Conditions carry one; operative terms do not. */
  why: string | null;
  /**
   * What the institution has to produce to show it.
   *
   * The shape's own answer — a document, an order of events, a figure, an
   * undertaking. Null on an operative term, where what shows it is the figure
   * itself and the registry that reads it, which question four already answers
   * on the same page. Nothing is inferred to fill the gap.
   */
  shownBy: StructureCondition['evidence'] | null;
  /** The most recent examination that reached it. Null where none ever has. */
  lastLooked: Looked | null;
  /** How many examinations reached it at all. */
  timesLooked: number;
  /** Exceptions counted against it, across every examination. */
  exceptions: number;
}

export interface Chain {
  ruleId: string;
  links: Link[];
  /** How many of them nobody has ever examined. The half a board cannot see. */
  neverLooked: number;
  /** Exceptions across the whole ruling. Counted, never judged. */
  exceptions: number;
  /** How many examinations name this ruling. */
  examinations: number;
}

/**
 * The most recent first.
 *
 * By the end of the period examined, not by when it was filed: an examination
 * of the March quarter recorded in October is evidence about March, and a board
 * asking *when was this last looked at* means the period, not the paperwork.
 * `recordedAt` breaks a tie, because two examinations of the same period are
 * ordered by which was written second.
 */
function newestFirst(a: Examination, b: Examination): number {
  return b.to.localeCompare(a.to) || b.recordedAt.localeCompare(a.recordedAt);
}

/**
 * Everything the record holds between one ruling and the evidence about it.
 *
 * `conditions` are the board's own, as it adopted them — not the shipped
 * library's, for the same reason an adoption copies them: a shape amended in
 * the library must not silently change what a board adopted two years ago.
 */
export function theChain(
  rule: Rule,
  held: {
    conditions: readonly StructureCondition[];
    terms: readonly RuleParameter[];
    examinations: readonly Examination[];
  },
): Chain {
  const mine = [...held.examinations].filter((e) => e.ruleId === rule.id).sort(newestFirst);

  const links: Link[] = [
    ...held.conditions.map(
      (c): Link => ({
        against: c.id,
        kind: 'condition',
        asks: c.requirement,
        why: c.why,
        shownBy: c.evidence,
        lastLooked: null,
        timesLooked: 0,
        exceptions: 0,
      }),
    ),
    ...held.terms.map(
      (p): Link => ({
        against: TERM + p.key,
        kind: 'term',
        asks: p.meaning,
        why: null,
        shownBy: null,
        lastLooked: null,
        timesLooked: 0,
        exceptions: 0,
      }),
    ),
  ];

  for (const link of links) {
    for (const e of mine) {
      /*
       * `looked` is the same reader the coverage report uses, deliberately.
       * The two disagreed about the shape of this field once already, and a
       * second copy of the rule here is how that happens again.
       */
      if (!looked(e).has(link.against)) continue;

      const f = e.findings.find((x) => x.against === link.against);
      if (!f || f.held === 'not_examined') continue;

      link.timesLooked += 1;
      link.exceptions += f.exceptions;
      // `mine` is newest first, so the first one that reaches it is the last look.
      if (!link.lastLooked) {
        link.lastLooked = {
          examinationId: e.id,
          from: e.from,
          to: e.to,
          recordedAt: e.recordedAt,
          held: f.held,
          exceptions: f.exceptions,
          note: f.note,
          againstTheseTerms: e.parameterHash === rule.parameterHash,
        };
      }
    }
  }

  return {
    ruleId: rule.id,
    links,
    neverLooked: links.filter((l) => l.timesLooked === 0).length,
    exceptions: links.reduce((n, l) => n + l.exceptions, 0),
    examinations: mine.length,
  };
}

/**
 * The matter a ruling came from.
 *
 * A `Rule` carries its terms and not the conditions it was judged against:
 * those belong to the shape, and the shape is named on the matter. So the chain
 * is drawn through the matter, which is the only join the record actually has.
 * Null where the ruling predates the matter that would carry it, which is true
 * of a seeded register and is a real answer rather than an error.
 */
export function matterBehind(rule: Rule, matters: readonly Matter[]): Matter | null {
  return matters.find((m) => m.proposedRule?.id === rule.id) ?? null;
}
