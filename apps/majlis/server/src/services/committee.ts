/**
 * A committee: some of the board, given a question to look at first.
 *
 * The last thing the board portals have that Majlis did not. A board of nine
 * does not read every contract in the room; three of them read it, and the
 * nine decide with their account in front of them.
 *
 * ── a committee never rules ───────────────────────────────────────────────
 *
 * This is the whole of the design and everything else follows from it. A
 * committee reports; the board decides. There is no committee vote, no
 * committee threshold, and no state a matter can reach through a committee
 * that it could not reach without one.
 *
 * The reason is arithmetic. A board's threshold is the number of signatures
 * that make a change binding on the institution. If three members of nine
 * could settle a matter inside a committee, the institution would be bound by
 * three signatures while its own governance document says five — and nobody
 * reading the record afterwards would see that it had happened, because the
 * matter would look settled in the ordinary way.
 *
 * So a referral changes exactly one thing: it records that the board asked
 * some of its members to look first, and it carries their account back.
 *
 * ── the remit is the board's own words ────────────────────────────────────
 *
 * Majlis ships no committee names, no standing committees and no default
 * remits. Which committees a board keeps is that board's constitution, and a
 * product that shipped an "Audit Committee" would be telling nine scholars how
 * to organise themselves.
 *
 * ── a report is words and who stood behind them ───────────────────────────
 *
 * Not a verdict, not a recommendation with a tick. The committee writes what
 * it found, and the members who agree with the account are named. A member of
 * the committee who does not agree is named too, with what they said instead:
 * a committee that reported unanimously because the dissent had nowhere to go
 * is the failure this application exists to prevent, one level down.
 */

export interface Committee {
  id: string;
  boardId: string;
  /** What the board calls it. Their words, never ours. */
  name: string;
  /** What it was formed to look at, in the board's own words. */
  remit: string;
  /** Members of the board, and only of the board. */
  members: string[];
  /** Who convenes it, where the board said. Absent is a real answer. */
  convenor?: string;

  formedIn: string;
  formedAt: string;
  /** Wound up, and when. It stays in the record either way. */
  dissolvedAt?: string;
}

/** One member's position on the account the committee wrote. */
export interface Standing {
  scholarId: string;
  /** True where they stand behind the account as written. */
  agrees: boolean;
  /** What they said instead, where they do not. Required when they do not. */
  said?: string;
  at: string;
}

export interface Referral {
  id: string;
  boardId: string;
  committeeId: string;
  matterId: string;

  /** Why the board is asking them to look. The board's words. */
  asking: string;
  referredBy: string;
  referredAt: string;

  /** The account the committee wrote, once it has written one. */
  report?: {
    found: string;
    by: string;
    at: string;
    /** Every committee member's position on it, dissent included. */
    standing: Standing[];
  };
  /** Withdrawn by the board before the committee reported. It stays. */
  withdrawn?: { by: string; at: string; why: string };
}

export type CommitteeRefusal =
  | 'no_name'
  | 'no_remit'
  | 'nobody_on_it'
  | 'not_on_this_board'
  | 'already_dissolved'
  | 'nothing_asked'
  | 'not_on_this_committee'
  | 'already_reported'
  | 'nothing_found'
  | 'dissent_needs_words'
  | 'already_withdrawn'
  | 'no_reason_given'
  | 'committee_is_dissolved';

export class Refused extends Error {
  constructor(
    readonly reason: CommitteeRefusal,
    message: string,
  ) {
    super(message);
    this.name = 'Refused';
  }
}

export interface FormInput {
  id: string;
  boardId: string;
  name: string;
  remit: string;
  members: string[];
  convenor?: string;
  /** The settled matter the board formed it in. Committees are decided, not configured. */
  formedIn: string;
  formedAt: string;
  /** Who is on the board, so a committee cannot name a stranger. */
  onTheBoard: readonly { id: string }[];
}

/**
 * Form one.
 *
 * `formedIn` is required and is a matter. A committee that could be created
 * from a settings screen would be a standing body brought into existence by
 * whoever had the settings page open — and the whole of this application says
 * that nothing becomes binding by administration.
 */
export function form(input: FormInput): Committee {
  const name = input.name.trim();
  const remit = input.remit.trim();

  if (!name) {
    throw new Refused('no_name', 'Give it the name the board calls it by.');
  }
  if (!remit) {
    throw new Refused(
      'no_remit',
      'Say what it was formed to look at. A committee with no remit is a list of names.',
    );
  }
  if (input.members.length === 0) {
    throw new Refused('nobody_on_it', 'Name who is on it. A committee of nobody looks at nothing.');
  }

  const onBoard = new Set(input.onTheBoard.map((m) => m.id));
  const stranger = input.members.find((m) => !onBoard.has(m));
  if (stranger) {
    throw new Refused(
      'not_on_this_board',
      `${stranger} is not on this board. A committee is some of the board, not somebody else.`,
    );
  }
  if (input.convenor && !input.members.includes(input.convenor)) {
    throw new Refused(
      'not_on_this_committee',
      'The convenor is not on the committee. Somebody convening a body they do not sit on is not convening it.',
    );
  }

  return {
    id: input.id,
    boardId: input.boardId,
    name,
    remit,
    members: [...input.members],
    ...(input.convenor ? { convenor: input.convenor } : {}),
    formedIn: input.formedIn,
    formedAt: input.formedAt,
  };
}

/** Wind one up. It stays in the record, with everything it reported. */
export function dissolve(current: Committee, at: string): Committee {
  if (current.dissolvedAt) {
    throw new Refused('already_dissolved', 'This committee was already wound up.');
  }
  return { ...current, dissolvedAt: at };
}

export interface ReferInput {
  id: string;
  committee: Committee;
  matterId: string;
  asking: string;
  referredBy: string;
  referredAt: string;
}

/** Ask a committee to look at a matter first. */
export function refer(input: ReferInput): Referral {
  const asking = input.asking.trim();
  if (!asking) {
    throw new Refused(
      'nothing_asked',
      'Say what the board is asking them to look at. A referral with no question is a matter moved sideways.',
    );
  }
  if (input.committee.dissolvedAt) {
    throw new Refused(
      'committee_is_dissolved',
      'That committee was wound up. Refer it to one the board still keeps, or form another.',
    );
  }

  return {
    id: input.id,
    boardId: input.committee.boardId,
    committeeId: input.committee.id,
    matterId: input.matterId,
    asking,
    referredBy: input.referredBy,
    referredAt: input.referredAt,
  };
}

export interface ReportInput {
  committee: Committee;
  found: string;
  by: string;
  at: string;
  /** Every member's position. Dissent carries words or it is not recorded. */
  standing: readonly Standing[];
}

/**
 * The committee's account of what it found.
 *
 * It has no outcome field on purpose. A committee that returned *permit* or
 * *refuse* would be the board reading a verdict rather than an account, and a
 * board that adopts a verdict it did not reason to has not decided anything.
 */
export function report(current: Referral, input: ReportInput): Referral {
  if (current.report) {
    throw new Refused(
      'already_reported',
      'This committee has already reported. A later account is a second referral, not a rewrite of the first.',
    );
  }
  if (current.withdrawn) {
    throw new Refused('already_withdrawn', 'The board withdrew this referral.');
  }
  if (!input.found.trim()) {
    throw new Refused(
      'nothing_found',
      'Write what the committee found. The board decides with this in front of it.',
    );
  }
  if (!input.committee.members.includes(input.by)) {
    throw new Refused(
      'not_on_this_committee',
      `${input.by} is not on this committee. An account of what a committee found is written by somebody who sat on it.`,
    );
  }

  for (const s of input.standing) {
    if (!input.committee.members.includes(s.scholarId)) {
      throw new Refused(
        'not_on_this_committee',
        `${s.scholarId} is not on this committee.`,
      );
    }
    if (!s.agrees && !(s.said ?? '').trim()) {
      throw new Refused(
        'dissent_needs_words',
        'A member who does not stand behind the account says what they say instead. Dissent recorded as a mark is dissent nobody can read.',
      );
    }
  }

  return {
    ...current,
    report: {
      found: input.found.trim(),
      by: input.by,
      at: input.at,
      standing: input.standing.map((s) => ({
        scholarId: s.scholarId,
        agrees: s.agrees,
        ...(s.said?.trim() ? { said: s.said.trim() } : {}),
        at: s.at,
      })),
    },
  };
}

/** The board takes it back. Recorded with a reason, like everything else. */
export function withdrawReferral(current: Referral, by: string, why: string, at: string): Referral {
  if (current.withdrawn) {
    throw new Refused('already_withdrawn', 'This referral was already withdrawn.');
  }
  if (current.report) {
    throw new Refused(
      'already_reported',
      'The committee has reported. What it found stays in front of the board.',
    );
  }
  if (!why.trim()) {
    throw new Refused(
      'no_reason_given',
      'Say why it is being taken back. A referral that disappears without a reason leaves the record disagreeing with what the board did.',
    );
  }
  return { ...current, withdrawn: { by, at, why: why.trim() } };
}

/** Where a referral has got to, in one word the interface can show. */
export type ReferralState = 'waiting' | 'reported' | 'withdrawn';

export function stateOf(r: Referral): ReferralState {
  if (r.withdrawn) return 'withdrawn';
  if (r.report) return 'reported';
  return 'waiting';
}

/**
 * Whether the committee was of one mind, and who was not.
 *
 * Returned rather than computed in three screens, and it never collapses to a
 * count: *four agreed* tells a board nothing it can act on, and *Board Member
 * C did not, because …* is the sentence the board has to read.
 */
export interface HowItStood {
  unanimous: boolean;
  agreed: string[];
  dissented: { scholarId: string; said: string }[];
  /** Members of the committee who recorded nothing either way. */
  silent: string[];
}

export function howItStood(committee: Committee, r: Referral): HowItStood | null {
  if (!r.report) return null;

  const said = new Map(r.report.standing.map((s) => [s.scholarId, s]));
  const agreed = r.report.standing.filter((s) => s.agrees).map((s) => s.scholarId);
  const dissented = r.report.standing
    .filter((s) => !s.agrees)
    .map((s) => ({ scholarId: s.scholarId, said: s.said ?? '' }));

  return {
    unanimous: dissented.length === 0 && committee.members.every((m) => said.has(m)),
    agreed,
    dissented,
    silent: committee.members.filter((m) => !said.has(m)),
  };
}

export interface CommitteeSummary {
  /** Referrals the committee has not answered. */
  waiting: number;
  reported: number;
  withdrawn: number;
  /** Reports that were not of one mind. Counted, because it is what a board reads first. */
  notUnanimous: number;
}

export function summarise(
  committee: Committee,
  referrals: readonly Referral[],
): CommitteeSummary {
  const mine = referrals.filter((r) => r.committeeId === committee.id);
  return {
    waiting: mine.filter((r) => stateOf(r) === 'waiting').length,
    reported: mine.filter((r) => stateOf(r) === 'reported').length,
    withdrawn: mine.filter((r) => stateOf(r) === 'withdrawn').length,
    notUnanimous: mine.filter((r) => {
      const stood = howItStood(committee, r);
      return stood !== null && !stood.unanimous;
    }).length,
  };
}
