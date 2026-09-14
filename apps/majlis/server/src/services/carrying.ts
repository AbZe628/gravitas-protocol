/**
 * What happens to these terms once the board has ruled.
 *
 * A scholar sets `minTangibleRatioBps = 5100` and knows exactly what it means
 * in fiqh. What almost nobody arriving from a classical board knows is **when
 * it gets checked**, and that is the whole difference between the two worlds
 * this application sits between.
 *
 * A condition in an ordinary fatwa is checked when somebody looks: at the next
 * meeting, in the quarterly review, at the annual audit. Between those moments
 * a pool can cross the line and trade for eleven weeks, and the board finds out
 * afterwards. A condition attached to an enforcing registry is read **before
 * every transaction that depends on it**, and the transaction that would breach
 * it does not execute. There is no interval to drift in.
 *
 * That is not a small operational detail. It changes what a board is doing when
 * it sets a number: it is no longer writing a condition somebody will be asked
 * to honour, it is writing one that will be applied without them. A scholar who
 * has not been told this will set thresholds the way they always have, and a
 * scholar who has been told will set them differently — more carefully in one
 * direction, less anxiously in the other.
 *
 * ── this is mechanism, so it is said without a model ──────────────────────
 *
 * It would have been natural to make this an assistant answer. It is not, and
 * deliberately: the application already knows whether something is attached,
 * what it is, and what these terms say. Routing a fact through a language model
 * would make it possible to get wrong, make it unavailable when the assistant
 * is off — which is most installations — and make a certainty read like an
 * opinion. Nothing here is generated. It is assembled from the matter's own
 * terms and the enforcement adapter's own snapshot.
 *
 * ── and it says nothing about whether the terms are right ─────────────────
 *
 * The same line as everywhere: it describes what will happen, never whether
 * what will happen is permissible. *"Read before every transaction; the
 * transaction does not execute"* is mechanism. *"Fifty-one per cent is the
 * correct threshold"* is a ruling, and no part of this file reaches for it.
 *
 * ── the honest case is the common one ─────────────────────────────────────
 *
 * Most installations have nothing attached, and that is the ordinary
 * arrangement rather than a degraded one. There the answer is that the
 * institution carries this out with whatever it already uses, that Majlis
 * cannot see whether it does, and that the interval between checks is
 * therefore whatever that system's interval is — which is a real limit and is
 * said rather than glossed.
 */

import type { EnforcementSnapshot } from './enforcement.js';
import { carriedOut, inAWord, type CarriedOut } from './marking.js';
import type { Asset, Matter, RuleParameter } from '../types.js';

/**
 * When a term is tested against reality. The distinction the whole file is for.
 *
 * `CheckCadence` rather than `Cadence`: `meeting.ts` already owns that name for
 * how often a board must sit, and the two are different clocks entirely.
 */
export type CheckCadence = 'before_every_transaction' | 'when_someone_looks' | 'unknown';

export interface TermCarried {
  key: string;
  value: string;
  unit?: string;
  /** The board's own words for what the term does. Never rewritten here. */
  meaning: string;
  /**
   * What this particular term does when it is not met, where the term itself
   * says so. Drawn from the board's terms, not inferred from the key's name.
   */
  onBreach: string | null;
}

export interface Carrying {
  matterId: string;
  /** Whether anything is attached that reads these terms. */
  attached: boolean;
  /** What it is, in its own words. Null where nothing is attached. */
  carrier: string | null;
  cadence: CheckCadence;
  /** The sentence a scholar most needs, about when this is tested. */
  whenChecked: string;
  /** What this means for the interval a breach could live in. */
  drift: string;
  terms: TermCarried[];
  /** What Majlis cannot see about this, named rather than glossed. */
  limits: string[];

  /**
   * Which of the holdings this ruling names a contract can refuse a breach
   * on, and which are carried out by people.
   *
   * The sentences above answer for the installation. This answers for the
   * holdings, which is what the handbook actually asks for: a bank with a
   * registry still holds conventional assets, and a ruling over one of those
   * is carried out by people exactly as it would be with no chain anywhere.
   */
  carriedOut: CarriedOut;
  /** The one sentence for that, composed from the two numbers. */
  carriedInAWord: string;
}

/*
 * Terms that say what happens on a breach.
 *
 * Matched on the term's own stated meaning rather than on its key, because a
 * key is a name somebody chose and reading intent out of a name is exactly the
 * inference `drift.ts` refuses to make. A board that called its breach term
 * `onFailure` is served the same as one that called it `onBreach`.
 */
const REFUSALS = [
  'block',
  'suspend',
  'halt',
  'reclassify',
  'freeze',
  /*
   * `revert` is the word a contract uses for refusing, and it was missing.
   * Two of the three seeded rulings say `revert` and neither of them could
   * answer *what happens if this fails* — on the matter screen either, since
   * that reads the same list. Found by running the list against the seed
   * rather than by reading it.
   */
  'revert',
  'reject',
  'refuse',
  'decline',
  'stop',
];

function isBreachBehaviour(term: RuleParameter): boolean {
  const value = term.value.toLowerCase();
  return REFUSALS.some((word) => value.includes(word));
}

/**
 * A term that fixes a figure, as opposed to one that names something.
 *
 * Read off the value and never off the key, for the reason above. `5100` is a
 * figure; `pool.navBreakdown` and `leased_property,trade_finance` name a place
 * to look and a set to be inside. A ruling with no figure in it is a standard
 * of conduct, and the difference decides two of the six answers below.
 */
function isFigure(term: RuleParameter): boolean {
  return /^-?\d+(\.\d+)?$/.test(term.value.trim());
}

/**
 * The consequence belongs beside the threshold, not beside itself.
 *
 * The first version attached a breach term's meaning to that same term, so the
 * screen read *"secondary transfers do not execute"* immediately followed by
 * *"when it is not met: secondary transfers do not execute"*. Found by looking
 * at it.
 *
 * What a scholar reading `minTangibleRatioBps = 5100` wants on that line is
 * what happens when the figure drops below it — which is written in a
 * different term. So the behaviour terms are found once and their meanings
 * attached to the thresholds, and a behaviour term carries nothing extra of
 * its own.
 */
function consequenceFor(term: RuleParameter, behaviours: RuleParameter[]): string | null {
  if (isBreachBehaviour(term) || behaviours.length === 0) return null;
  return behaviours.map((b) => b.meaning).join(' ');
}

const NOTHING_ATTACHED_LIMITS = [
  'Majlis records what the board decided. It does not carry it out, and it cannot see whether anything else did.',
  'Nothing here reads the institution’s systems, so a term that stopped being honoured would not show up on this record.',
];

const ATTACHED_LIMITS = [
  'Majlis reads what the registry currently says. It does not write to it, and a decision taken here does not itself change what is enforced — that is a separate act by whoever holds the key.',
  'A term the registry does not implement is not enforced by being written here. What is carried out is what the registry was configured to read.',
];

/**
 * What a ruling in force means from one day to the next.
 *
 * ── the six answers, and why they are not six sentences ───────────────────
 *
 * The handbook promises that every ruling answers the same six questions in
 * the same six places: what the board decided, how it is measured, whether it
 * moves, when it is checked, what happens if it fails, and who is told. A
 * ruling that says *the tangible share must stay above fifty-one per cent*
 * tells a person about to place a trade almost nothing on its own.
 *
 * This returns the **facts** and not the sentences. The sentences are built in
 * the interface, out of the dictionaries, because this application is read in
 * English, Arabic and Urdu and prose assembled here would be English in all
 * three. `whenChecked` and `drift` above are older and are English wherever
 * they appear, which is a fault this does not repeat.
 *
 * The board's own words are the exception and travel unchanged: a term's
 * `meaning` is what the board wrote and nothing here rewrites or translates
 * it.
 *
 * ── where nothing answers, it says so ─────────────────────────────────────
 *
 * A ruling that is a standard of conduct rather than a measurement has nothing
 * that measures it, and only a person reading the file can tell whether it is
 * being kept. That is an answer and it is given. An empty box is not: a board
 * that never sees the question assumes the software has it covered.
 */
export interface DayToDay {
  ruleId: string;
  /** Whether anything is attached that reads these terms. */
  attached: boolean;
  carrier: string | null;
  cadence: CheckCadence;
  /** The board's own words. Never rewritten, never translated. */
  statement: string;
  /** Terms that fix a figure. */
  figures: TermCarried[];
  /** Terms that name a place to look or a set to be inside. */
  names: TermCarried[];
  /** Terms that say what happens when the ruling is not met. */
  behaviours: TermCarried[];
  /**
   * Whether the thing being measured can change without anybody acting.
   *
   * A figure read from a source moves with whatever that source reports. A set
   * of permitted categories does not move at all: it changes when the board
   * changes it and at no other time.
   */
  moves: 'with_what_it_is_read_from' | 'only_when_the_board_changes_it';
  /** What Majlis cannot see about this, named rather than glossed. */
  limits: string[];
}

export function buildDayToDay(
  rule: { id: string; statement: string; parameters: RuleParameter[] },
  snapshot: EnforcementSnapshot,
): DayToDay {
  const parameters = rule.parameters ?? [];
  const behaviours = parameters.filter(isBreachBehaviour);
  const rest = parameters.filter((p) => !isBreachBehaviour(p));
  const figures = rest.filter(isFigure);
  const names = rest.filter((p) => !isFigure(p));

  const carried = (list: RuleParameter[]): TermCarried[] =>
    list.map((p) => ({
      key: p.key,
      value: p.value,
      unit: p.unit,
      meaning: p.meaning,
      onBreach: null,
    }));

  /*
   * It moves only if there is a figure and something that says where the
   * figure is read from. A figure with no source named is a figure somebody
   * supplies by hand, and calling that "it follows the market" would be this
   * file inventing a mechanism the ruling does not describe.
   */
  const moves =
    figures.length > 0 && names.length > 0
      ? 'with_what_it_is_read_from'
      : 'only_when_the_board_changes_it';

  const limits = snapshot.configured ? [...ATTACHED_LIMITS] : [...NOTHING_ATTACHED_LIMITS];

  /*
   * Nobody is told by this software. Notices are composed and the sending is
   * off unless the institution wires its own relay, and a board reading "the
   * desk is told" would believe an email goes out. It is a limit and it is
   * named here rather than left for somebody to discover.
   */
  limits.push(
    'Majlis composes a notice when something happens, and sends nothing unless this installation ' +
      'has been given the institution’s own mail relay. Until it has, whoever needs to know is ' +
      'told by somebody reading this screen.',
  );

  if (snapshot.configured && snapshot.reachable === false) {
    limits.unshift(
      `${snapshot.label ?? 'The enforcing registry'} could not be read just now` +
        `${snapshot.error ? `: ${snapshot.error}` : '.'} What is above is what it was configured ` +
        'to do, not a confirmation that it is doing it.',
    );
  }

  return {
    ruleId: rule.id,
    attached: snapshot.configured,
    carrier: snapshot.configured ? (snapshot.label ?? 'the enforcing registry') : null,
    cadence: snapshot.configured ? 'before_every_transaction' : 'when_someone_looks',
    statement: rule.statement,
    figures: carried(figures),
    names: carried(names),
    behaviours: carried(behaviours),
    moves,
    limits,
  };
}

export function buildCarrying(
  matter: Matter,
  snapshot: EnforcementSnapshot,
  /**
   * The register, so the split below can be made. Absent where a caller has
   * none, and the ruling is then reported as naming no holding — which is
   * what a caller without a register can honestly say.
   */
  holdings: readonly Asset[] = [],
): Carrying {
  const carried = carriedOut(matter, holdings, snapshot);
  const marked = { carriedOut: carried, carriedInAWord: inAWord(carried) };
  const parameters = matter.proposedRule.parameters ?? [];

  const behaviours = parameters.filter(isBreachBehaviour);

  const terms: TermCarried[] = parameters.map((p) => ({
    key: p.key,
    value: p.value,
    unit: p.unit,
    meaning: p.meaning,
    onBreach: consequenceFor(p, behaviours),
  }));

  // Attached but unreachable is not the same as nothing attached, and reporting
  // the first as the second would tell a board its conditions are unenforced
  // when they may be running perfectly behind a network fault.
  if (!snapshot.configured) {
    return {
      matterId: matter.id,
      attached: false,
      carrier: null,
      cadence: 'when_someone_looks',
      whenChecked:
        'Nothing is attached to this installation, so these terms are carried out by whatever ' +
        'this institution already uses. That is the ordinary arrangement rather than a missing ' +
        'piece — but it means the terms are tested when somebody looks, not continuously.',
      drift:
        'A condition tested when somebody looks can be crossed and re-crossed between those ' +
        'moments. If the review is quarterly, a breach can stand for a quarter before the board ' +
        'hears of it. That interval is a real thing the board is deciding about, and it belongs ' +
        'in the ruling rather than in an assumption.',
      terms,
      limits: NOTHING_ATTACHED_LIMITS,
      ...marked,
    };
  }

  const carrier = snapshot.label ?? 'the enforcing registry';
  const unreachable = snapshot.reachable === false;
  const paused = snapshot.paused === true;

  /*
   * No markdown. Nothing renders it, so asterisks printed as asterisks on the
   * screen — and emphasis is the interface's job rather than the record's. The
   * badge above this sentence already carries it.
   */
  const whenChecked =
    `These terms are read by ${carrier} before every transaction that depends on them. ` +
    'A transaction that would breach one does not execute — it is refused at the point of ' +
    'attempt rather than found afterwards.';

  const drift =
    'There is no interval to drift in. A condition applied before every transaction cannot be ' +
    'crossed quietly between meetings and discovered at the audit: the moment the figure moves ' +
    'past the line, the transactions that depend on it stop. What the board still decides is ' +
    'what should happen next — whether a breach is permanent, and whether a pool that comes ' +
    'back within the line resumes on its own or waits for the board.';

  const limits = [...ATTACHED_LIMITS];
  if (unreachable) {
    limits.unshift(
      `${carrier} could not be read just now${snapshot.error ? `: ${snapshot.error}` : '.'} ` +
        'What is above is what it was configured to do, not a confirmation that it is doing it.',
    );
  }
  if (paused) {
    limits.unshift(
      `${carrier} is paused. While it is, it is not applying these terms to anything, and the ` +
        'board should read the whole of this section as describing what will happen when it resumes.',
    );
  }

  return {
    ...marked,
    matterId: matter.id,
    attached: true,
    carrier,
    // Paused or unreachable, the cadence it was configured for is still the
    // cadence — what changes is our confidence that it is running, and that is
    // carried in `limits` rather than by quietly downgrading the fact.
    cadence: 'before_every_transaction',
    whenChecked,
    drift,
    terms,
    limits,
  };
}
