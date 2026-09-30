import { quorumFor, Refused } from './lifecycle.js';
import type { Board, Matter, MatterStatus } from '../types.js';

type ConsensusRefusal = 'already_settled' | 'already_past' | 'bad_date' | 'no_reason_given';

function refuse(code: ConsensusRefusal, message: string): never {
  throw new Refused(code as never, message);
}

/** Long enough that "to be fair" is not a reason. */
const MIN_REASON_CHARS = 20;

const SETTLED: readonly MatterStatus[] = ['in_force', 'rejected', 'withdrawn', 'lapsed'];

/**
 * Whether the board agreed, or carried it — and who was never heard from.
 *
 * ── what the vote said before this ────────────────────────────────────────
 *
 * A restricting matter with two positions recorded out of five signatories.
 * The vote window read:
 *
 *     2 of 2 · Threshold met · Against 0 · Abstain 0
 *     Not yet recorded: Board Member C · Board Member D · Board Member E
 *     [ Close the vote ]
 *
 * Every figure on it is true and the whole reads as finished. *2 of 2* is the
 * count against the threshold, not against the board; *threshold met* is the
 * headline; and *close the vote* sits under it as the obvious next act. Three
 * members had said nothing at all and nothing on the screen suggested that
 * closing now would decide without them.
 *
 * The written ruling was no better. It carries those for, those against, those
 * abstaining, the quorum required and the quorum recorded — and no way at all
 * to tell that three signatories never answered. A reader a year later sees
 * *2 for, 2 required* and reads a board that agreed.
 *
 * ── what IFSB-10 asks for ─────────────────────────────────────────────────
 *
 * That a board seek agreement, and that where it decides by a majority
 * instead, the record says so. Neither half existed here: there was no notion
 * of agreement in the application at all, so there was nothing a record could
 * have said.
 *
 * ── and what this will not do ─────────────────────────────────────────────
 *
 * **It does not block closing.** The threshold is the board's and was fixed
 * when the question was put; a reading that refused to let a board close on
 * its own quorum would be this file governing. What it does is say, in the
 * place where the act is offered, which of the two is about to happen.
 *
 * **It does not count silence as dissent.** A member who has not spoken has
 * not disagreed, and a system that treated the two alike would report a board
 * as divided whenever somebody was travelling. Silence is its own state and
 * is named as itself.
 */

/**
 * `consensus` — every signatory has a standing position and all are for.
 * `majority` — enough are for, but somebody dissented, abstained or is silent.
 * `divided`  — somebody is against or abstaining, and the threshold is not met.
 * `not_yet`  — nobody is against, and not enough have spoken to carry it.
 */
export type Agreement = 'consensus' | 'majority' | 'divided' | 'not_yet';

export interface Standing {
  state: Agreement;
  /** Whether every signatory on the board has a standing position. */
  everybodySpoke: boolean;
  for: string[];
  against: string[];
  abstained: string[];
  /**
   * Signatories with no standing position — never heard from, or released.
   *
   * Named rather than counted. *Three have not answered* tells a chair there
   * is a problem; the names tell them whom to ask, which is the only part
   * anybody can act on.
   */
  silent: string[];
  required: number;
  /** Where the board set itself a period to seek agreement, and when it ends. */
  seekingUntil: string | null;
  /** True once that period has run. Null seeking is never past. */
  periodPast: boolean;
}

/**
 * Where the board stands on agreeing, read from the record.
 *
 * A released position is not a position: it was cast on a question that has
 * since changed, it stays in the record and stays out of the arithmetic, and
 * the member is once again somebody who has not answered the question in
 * front of them. Same rule as `tally`, because two readings of one vote that
 * disagreed about who had spoken would be the fault this application keeps
 * finding in itself.
 */
export function standingOn(board: Board, matter: Matter, now: string): Standing {
  const signatories = board.members.filter((m) => m.signatory).map((m) => m.id);

  const held = new Map<string, 'for' | 'against' | 'abstain'>();
  for (const r of matter.reasoning) {
    if (r.releasedAt) continue;
    if (!signatories.includes(r.scholarId)) continue;
    held.set(r.scholarId, r.position);
  }

  const of = (p: 'for' | 'against' | 'abstain') =>
    signatories.filter((id) => held.get(id) === p);

  const forIt = of('for');
  const against = of('against');
  const abstained = of('abstain');
  const silent = signatories.filter((id) => !held.has(id));

  const required = matter.quorumWhenOpened ?? quorumFor(board, matter.direction);
  const met = forIt.length >= required;
  const everybodySpoke = silent.length === 0;
  const opposed = against.length > 0 || abstained.length > 0;

  const seekingUntil = seekingAgreementUntil(matter);

  return {
    state: everybodySpoke && !opposed && met
      ? 'consensus'
      : met
        ? 'majority'
        : opposed
          ? 'divided'
          : 'not_yet',
    everybodySpoke,
    for: forIt,
    against,
    abstained,
    silent,
    required,
    seekingUntil,
    periodPast: seekingUntil !== null && seekingUntil <= now,
  };
}

/**
 * The period the board gave itself to reach agreement, where it set one.
 *
 * The last entry, as everywhere. A board that extends the period once has said
 * two things and the second stands; both stay readable, because *how long did
 * they wait before carrying it* is a question the next board asks.
 */
export function seekingAgreementUntil(matter: Matter): string | null {
  const said = matter.seekingAgreement ?? [];
  return said.length > 0 ? said[said.length - 1].until : null;
}

/**
 * Give the board until a date to agree, rather than carrying it now.
 *
 * Refused on a settled matter and on a date already past: a period that ended
 * before it was set is not a period, it is a record of having meant to wait.
 * The reason is compulsory for the reason every reason here is — the next
 * board reads *why did they give it a fortnight* out of the same place they
 * read *why did they carry it*.
 */
export function seekAgreementUntil(
  matter: Matter,
  said: { until: string; by: string; reason: string },
  at: string,
): Matter {
  if (SETTLED.includes(matter.status)) {
    refuse('already_settled', 'This matter is settled. There is nothing left to agree on.');
  }

  const until = new Date(said.until);
  if (Number.isNaN(until.getTime())) {
    refuse('bad_date', 'That is not a date.');
  }
  if (until.toISOString() <= at) {
    refuse(
      'already_past',
      'That date has gone. A period that ended before it was set is a record of ' +
        'having meant to wait, not a period.',
    );
  }

  const why = (said.reason ?? '').trim();
  if (why.length < MIN_REASON_CHARS) {
    refuse(
      'no_reason_given',
      `Setting a period to seek agreement needs a written reason of at least ${MIN_REASON_CHARS} ` +
        'characters. The next board reads it beside how long you waited.',
    );
  }

  return {
    ...matter,
    seekingAgreement: [
      ...(matter.seekingAgreement ?? []),
      { until: until.toISOString(), by: said.by, at, reason: why },
    ],
  };
}

/**
 * How a settled matter was decided, for the written ruling.
 *
 * Only the two words that mean anything to a reader of a finished decision:
 * the board agreed, or the board carried it. A matter still open has neither
 * and says so by returning null rather than by guessing at the one it is
 * heading for.
 */
export function decidedBy(board: Board, matter: Matter, now: string): {
  how: 'consensus' | 'majority';
  silent: string[];
  against: string[];
  abstained: string[];
} | null {
  const standing = standingOn(board, matter, now);
  if (standing.state !== 'consensus' && standing.state !== 'majority') return null;
  return {
    how: standing.state,
    silent: standing.silent,
    against: standing.against,
    abstained: standing.abstained,
  };
}
