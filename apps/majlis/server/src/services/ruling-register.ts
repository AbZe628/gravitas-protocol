import type { Undertaking } from './undertaking.js';
import type { Examination, Matter, Rule } from '../types.js';

/**
 * A ruling entering the register of what stands, and what the one it replaced
 * was carrying.
 *
 * ── the two things that were not true ─────────────────────────────────────
 *
 * **A ruling the board brought into force did not reach the register.** The
 * rules were the seed and only the seed: nothing anywhere added one. So the
 * application said both things at once, two tabs apart on the same screen —
 * *what we decided* listed the restoration window as **in force**, and *in
 * force today* said **3 in force** and did not include it. The board's own
 * decision never arrived at the list of what stands.
 *
 * **And nothing was ever superseded.** `supersededBy` is read in five places
 * — the annual report's count of rulings in force at year end, the manual's
 * split into current and superseded, `review.ts` (a superseded ruling needs no
 * review), `export.ts`, `dossier.ts` — and written nowhere. Two seeded rulings
 * claim to be version 3 and version 2 with no predecessor in existence. The
 * register page says, in its own words, *the chain of what replaced what is
 * drawn, not implied*, and there was no chain to draw: every branch on that
 * flag was unreachable.
 *
 * Found by listing the rules and reading the two tabs.
 *
 * ── what this does not decide ─────────────────────────────────────────────
 *
 * Nothing about whether the amendment is right, and nothing about when. The
 * binding acts are the vote and the timelock, both of which have already
 * happened by the time anything here runs. Writing the register entry is
 * bookkeeping that follows a decision, never a decision — which is why it is
 * refused on a matter that is not in force, rather than being the thing that
 * puts one there.
 */

/** The statuses under which a matter's ruling belongs in the register. */
const IN_FORCE = 'in_force';

export type RegisterRefusal = 'not_in_force' | 'nothing_proposed' | 'already_registered' | 'not_amendable';

export class NotRegistrable extends Error {
  constructor(
    readonly code: RegisterRefusal,
    message: string,
  ) {
    super(message);
    this.name = 'NotRegistrable';
  }
}

/**
 * The ruling to write, and the one it replaces.
 *
 * `null` where there is nothing to write — a matter carrying no proposed
 * ruling, or one whose ruling is already registered. Both are ordinary: a
 * matter may be a question the board answered without setting a standard, and
 * a register entry written twice would be the same ruling standing twice.
 */
export function entersTheRegister(
  matter: Matter,
  rules: readonly Rule[],
  at: string,
): { rule: Rule; replaces: Rule | null } | null {
  if (matter.status !== IN_FORCE) {
    throw new NotRegistrable(
      'not_in_force',
      'A ruling enters the register when the board has brought it into force, not before.',
    );
  }

  const proposed = matter.proposedRule;
  if (!proposed || !proposed.id) return null;

  // Already there. A matter brought into force twice — or a route that runs
  // this after `close` and again after `force` — must not write it again.
  if (rules.some((r) => r.id === proposed.id)) return null;

  /*
   * What this amends, if anything.
   *
   * Taken from the matter, which is where the board said it, and never
   * guessed from a title or a structure. Two rulings about the same shape are
   * not the same ruling, and a register that inferred the chain would put a
   * board's words under a heading it never chose.
   */
  const replaces = matter.amends ? (rules.find((r) => r.id === matter.amends) ?? null) : null;

  if (matter.amends && !replaces) {
    throw new NotRegistrable(
      'not_amendable',
      `This matter amends "${matter.amends}", which is not in the register of this board.`,
    );
  }

  if (replaces?.supersededBy) {
    throw new NotRegistrable(
      'not_amendable',
      `That ruling was already replaced by "${replaces.supersededBy}". Amending a version that no ` +
        'longer stands would leave two rulings claiming to be current.',
    );
  }

  const rule: Rule = {
    ...proposed,
    boardId: matter.boardId,
    // One past whatever it replaces, and 1 where it replaces nothing. Never
    // the number the proposal carried: a draft written months ago against
    // version 2 would come into force claiming to be version 2 again.
    version: replaces ? replaces.version + 1 : 1,
    inForceFrom: matter.inForceAt ?? at,
    supersededBy: null,
    supersedes: replaces?.id ?? null,
    /*
     * The board's own housekeeping does not carry across. How often the
     * previous version came back was a decision about that version, taken by
     * people looking at it; inheriting it would make the new ruling answer a
     * question nobody has asked about it. It arrives unscheduled, which is a
     * step the passage already puts in every signatory's queue.
     */
    reviewEveryMonths: undefined,
    reviewIntervals: undefined,
    lastReviewedAt: undefined,
  };

  return { rule, replaces };
}

/** One thing that was decided or promised under a particular ruling. */
export interface RestedOn {
  kind: 'examination' | 'undertaking' | 'matter';
  id: string;
  title: string;
  at: string;
  /**
   * Whether it was recorded against the exact terms that were replaced.
   *
   * An examination carries the hash of the operative terms it tested, so it
   * can say this outright. Nothing else can, and nothing else claims to.
   */
  againstTheseTerms: boolean | null;
}

/**
 * Everything that rested on a ruling, for the board to look at again.
 *
 * ── why this is put in front of them ──────────────────────────────────────
 *
 * A board that amends a standard has changed what the institution is measured
 * by. Every examination run under the old terms tested something that is no
 * longer the test; every undertaking given under it was a promise about a
 * rule that has moved. None of that becomes wrong by itself, and this file
 * says nothing about whether any of it is — it lists what is affected and
 * puts it before the people whose judgement that is.
 *
 * It computes; it does not conclude. An examination against replaced terms is
 * reported as exactly that, and whether it has to be run again is the board's
 * to say.
 */
export function whatRestedOn(
  rule: Rule,
  held: {
    examinations: readonly Examination[];
    undertakings: readonly Undertaking[];
    matters: readonly Matter[];
  },
): RestedOn[] {
  const out: RestedOn[] = [];

  for (const e of held.examinations) {
    if (e.ruleId !== rule.id) continue;
    out.push({
      kind: 'examination',
      id: e.id,
      title: `${e.from} — ${e.to}`,
      at: e.to,
      againstTheseTerms: e.parameterHash === rule.parameterHash,
    });
  }

  /*
   * Through the matter, because an undertaking does not name a ruling.
   *
   * It names the sitting it was minuted at and, where it came from one, the
   * agenda item. So what a promise rests on is whatever ruling that matter
   * made — which is the honest chain and not a guess: the alternative is
   * matching on words, and two promises about the same ratio are not
   * necessarily about the same ruling.
   */
  const fromThisRule = new Set(
    held.matters.filter((m) => m.proposedRule?.id === rule.id).map((m) => m.id),
  );
  for (const u of held.undertakings) {
    if (!u.matterId || !fromThisRule.has(u.matterId)) continue;
    // Only what is still owed. A promise already kept was kept under the terms
    // that stood at the time, and putting it in front of the board again would
    // be asking them to re-do something finished.
    if (u.state !== 'open') continue;
    out.push({
      kind: 'undertaking',
      id: u.id,
      title: u.what,
      at: u.minutedAt,
      againstTheseTerms: null,
    });
  }

  for (const m of held.matters) {
    if (m.amends !== rule.id) continue;
    out.push({
      kind: 'matter',
      id: m.id,
      title: m.title,
      at: m.inForceAt ?? m.openedAt,
      againstTheseTerms: null,
    });
  }

  return out.sort((a, b) => b.at.localeCompare(a.at));
}
