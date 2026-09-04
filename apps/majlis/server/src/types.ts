/**
 * Gravitas Majlis — domain types
 *
 * These types describe the record a Shariah board produces while governing
 * on-chain policy. Stage One is read-only: nothing here is written by a
 * scholar through the application yet. The shapes are defined now so that
 * the record produced in Stage One is the same record that later stages
 * will sign.
 */

export type Language = 'en' | 'ar' | 'ur';

/** The direction a proposed change moves compliance in. */
export type ChangeDirection = 'permit' | 'restrict';

/**
 * Permitting is slow by design: full deliberation, full threshold, full
 * timelock. Restricting is fast: reduced threshold, immediate effect,
 * ratified afterwards. The failure mode is always toward refusal.
 */
export const TIMELOCK_HOURS: Record<ChangeDirection, number> = {
  permit: 48,
  restrict: 0,
};

export type MatterStatus =
  | 'draft'
  | 'deliberation'
  | 'voting'
  | 'timelock'
  | 'in_force'
  | 'withdrawn'
  | 'rejected'
  | 'lapsed';

export type MatterOrigin =
  | 'institution_request'
  | 'protocol_change'
  | 'periodic_review'
  | 'compliance_concern';

export interface Scholar {
  id: string;
  name: string;
  title: string;
  board: string;
  /** Whether this member holds signing authority. Advisory members do not. */
  signatory: boolean;
}

/**
 * Whose boards these are.
 *
 * A Shariah board belongs to an institution, and **no bank shares a database
 * with another bank.** That sentence is the whole reason this type exists: not
 * to add a label to a board, but to give isolation somewhere to be enforced.
 *
 * Isolation is enforced at the store boundary rather than in each route. There
 * are thirty-two routes and twelve store methods; scoping the routes would be
 * thirty-two chances to forget, and forgetting once means one institution's
 * deliberation reaching another. A route is handed a store that is already
 * scoped and cannot reach outside it.
 *
 * **A single deployment per institution remains the arrangement a bank will
 * actually ask for**, and this does not replace it. What it does is make the
 * record correct either way, so serving two institutions is a deployment
 * decision rather than a rewrite.
 */
export interface Institution {
  id: string;
  name: string;
  /** How the institution refers to itself, where a name is too long to show. */
  shortName?: string;
}

export interface Board {
  id: string;
  /** Whose board this is. Everything below a board inherits its institution. */
  institutionId: string;
  name: string;
  /** Signatures required for an ordinary (permitting) change. */
  quorumPermit: number;
  /** Signatures required for a restricting change. Lower by design. */
  quorumRestrict: number;
  totalSignatories: number;
  /** Hours a restriction stands before it must be ratified or lapses. */
  ratificationWindowHours: number;
  members: Scholar[];
}

/** A single operative parameter as it would be written to the registry. */
export interface RuleParameter {
  key: string;
  value: string;
  unit?: string;
  /** Plain-language statement of what this parameter does. */
  meaning: string;

  /**
   * What in a holding's composition this term is measured against, if anything.
   *
   * Stated by the board rather than inferred from the key. Keys are free text,
   * and guessing that `minTangibleRatioBps` watches the tangible proportion
   * would be the software reading a name and concluding — which is the one
   * thing it must not do. Two boards will name the same term differently and a
   * third will name a different term the same way.
   *
   * Absent on everything recorded before this existed, and absent by choice on
   * terms that watch nothing. Where it is absent the drift service reports the
   * term as unwatched rather than quietly watching nothing.
   */
  watches?: {
    kind: CompositionPart['kind'];
    /** Whether the value is a floor or a ceiling. The difference is the whole test. */
    bound: 'minimum' | 'maximum';
  };
}

export interface Rule {
  id: string;
  boardId: string;
  title: string;
  /** Human statement of the rule as the board expressed it. */
  statement: string;
  parameters: RuleParameter[];
  /**
   * Hash of the exact parameters. What a scholar signs in Stage Three is
   * this value, which is why "was what was approved what was deployed"
   * reduces to a comparison rather than to testimony.
   */
  parameterHash: string;
  version: number;
  inForceFrom: string | null;

  /**
   * How often this rule returns to the board, in months.
   *
   * Set when the rule takes effect, because that is the only moment anyone is
   * thinking about it. A rule with no interval is reviewed when somebody
   * happens to remember, which is the failure this field exists to end.
   *
   * Optional: rules recorded before this existed have none, and are reported as
   * unscheduled rather than quietly given a default nobody chose.
   */
  reviewEveryMonths?: number;
  /**
   * When the board last looked at it, whatever it concluded. Absent until the
   * first review, after which the interval runs from here rather than from
   * `inForceFrom`.
   */
  lastReviewedAt?: string;

  supersededBy: string | null;
  supersedes: string | null;
  sources: SourceRef[];
}

export type SourceKind =
  /** A published standard: AAOIFI, IFSB, a central bank circular. */
  | 'standard'
  /** A ruling that already exists — this board's or another's. */
  | 'ruling'
  /** Something written down: a memo, an opinion, a file. */
  | 'document'
  /** Somewhere on the web. */
  | 'external'
  /** The contracts themselves. */
  | 'code'
  /** A test that demonstrates a behaviour. */
  | 'test'
  /** An address or transaction on chain. */
  | 'chain';

export const SOURCE_KINDS: readonly SourceKind[] = [
  'standard', 'ruling', 'document', 'external', 'code', 'test', 'chain',
];

export interface SourceRef {
  kind: SourceKind;
  /** What it is, in the words a reader would look for. */
  label: string;
  /** Where it is: a citation, a URL, a path, an address. */
  ref: string;

  /**
   * Everything below is optional, because the record already holds sources that
   * predate it and rewriting history to add fields would be its own kind of lie.
   */

  /** Stable enough to withdraw one without withdrawing its neighbour. */
  id?: string;
  /** Who attached it. Absent on sources that came with the seed. */
  addedBy?: string | null;
  at?: string;
  /** Why this is here — the sentence a reader needs and the citation does not give. */
  note?: string;

  /**
   * Withdrawn rather than deleted, like a released vote: a member who cited
   * something and then thought better of it is part of how the board reasoned,
   * and a record that loses that is not a record.
   */
  withdrawnAt?: string | null;

  /**
   * Set when the source is an uploaded file rather than a citation. Declared
   * now and unused: storage here is not durable, and a feature that silently
   * loses a scholar's document is worse than one that does not exist. When a
   * volume is mounted, an upload becomes a source of kind 'document' carrying
   * this, and nothing written before then needs migrating.
   */
  file?: { name: string; bytes: number; mediaType: string; key: string } | null;
}

export interface Reasoning {
  scholarId: string;
  position: 'for' | 'against' | 'abstain';
  /** A vote is not accepted without a written reason. */
  reason: string;
  at: string;
  /**
   * The parameter hash as it stood when this position was recorded.
   *
   * This is what makes the hash worth computing. "Did this member approve these
   * exact terms" becomes a comparison rather than an argument about what was on
   * the screen at the time — and if the terms are ever changed under a standing
   * vote, the mismatch is visible instead of silent.
   *
   * Absent on positions recorded before the field existed.
   */
  onParameterHash?: string;

  /**
   * When this position stopped counting, if it has.
   *
   * A vote is a position on the matter as it stood, so returning the matter to
   * deliberation releases every position cast on it. Released rather than
   * deleted: a member who voted and then saw the question change is part of how
   * the decision was reached, and a record that quietly loses that is not a
   * record. The tally ignores these; the page still shows them.
   */
  releasedAt?: string | null;
}

export interface Deliberation {
  id: string;
  scholarId: string;
  body: string;
  at: string;
  replyTo: string | null;
  /** Set when a technical liaison answers a question of mechanism. */
  liaisonAnswer: boolean;
}

/**
 * Consequence shown before deliberation. A threshold ceases to be an
 * abstraction and becomes a set of outcomes that can be argued with.
 */
export interface Simulation {
  windowFrom: string;
  windowTo: string;
  transactionsExamined: number;
  transactionsAffected: number;
  affectedSample: SimulatedTransaction[];
  note: string;
}

export interface SimulatedTransaction {
  hash: string;
  at: string;
  asset: string;
  valueUsd: number;
  /** Why this transaction would not have proceeded. */
  reason: string;
}

export interface Matter {
  id: string;
  boardId: string;
  title: string;
  origin: MatterOrigin;
  direction: ChangeDirection;
  status: MatterStatus;
  openedAt: string;

  /**
   * When the institution first asked, as against when it reached this system.
   *
   * These are not the same date and pretending they are would flatter the
   * board. A business unit that raised a structure by email three weeks before
   * anybody opened a matter has been waiting three weeks, and a measurement
   * that starts at `openedAt` reports a board deciding in four days when the
   * institution experienced twenty-five.
   *
   * Optional, and absent on everything recorded before it existed. Where it is
   * absent the wait is measured from `openedAt` and the figure is marked as
   * measuring only the part this system can see — an understated number that
   * says so beats a confident one that is wrong.
   */
  arrivedAt?: string;

  /**
   * When the board's part ended: the vote closed, an objection halted it, it
   * was withdrawn, or it lapsed.
   *
   * Deliberately not the same as `inForceAt`. A permitting change sits in a
   * 48-hour timelock *after* the board has decided, and that delay is a
   * deliberate safety property rather than slowness — charging it to the
   * board's pace would punish the system for working as designed.
   *
   * Absent on matters settled before the field existed; the record's last
   * event stands in, which is approximate and reported as such.
   */
  settledAt?: string;

  /** What is proposed, in ordinary language. */
  proposal: string;
  /** What is expressly NOT being decided. Prevents narrow approvals being
   *  later treated as broad endorsements. */
  notDecided: string[];
  /** What mechanically occurs when the rule applies. */
  mechanism: string;
  /**
   * What the institution must actually do, in order.
   *
   * Distinct from `mechanism`, which describes what happens; these are the
   * steps somebody follows. IFSB GN-6 asks an institution to hold a Shariah
   * compliance manual of every approved product **and the steps by which it is
   * implemented**, and prose describing a mechanism is not that: a compliance
   * officer checking whether a desk followed the ruling needs an ordered list
   * they can tick against.
   *
   * Optional, and absent on everything recorded before it existed. The manual
   * says so rather than presenting an entry as complete when it is not.
   */
  implementationSteps?: string[];
  /** Rules this interacts with or would supersede. */
  interactsWith: string[];

  /**
   * What this matter is about.
   *
   * The link that makes the two outputs one thing. Without it the fatwa is
   * prose concerning something and the registry entry is keyed by a hand-typed
   * string, and nothing guarantees the two refer to the same object.
   *
   * Optional and absent on everything recorded before it existed. A matter with
   * no asset is a question about the process rather than about a holding, which
   * is a real thing a board does.
   */
  assetIds?: string[];

  /**
   * The contract shape this is being judged against, if any.
   *
   * Optional, because plenty of matters are not product approvals. Where it is
   * set, the board rules on the structure's conditions one at a time instead of
   * composing the question from nothing.
   */
  structureId?: string;
  /**
   * Where the board has got to on each condition.
   *
   * Append-only like every other position here: a finding is superseded by a
   * later one from the same member rather than overwritten, so how the board
   * arrived at its view stays visible.
   */
  findings?: ConditionFinding[];

  proposedRule: Rule;
  simulation: Simulation | null;
  deliberation: Deliberation[];
  reasoning: Reasoning[];

  /** Set once the threshold is met and the timelock begins. */
  timelockStartedAt: string | null;
  timelockEndsAt: string | null;
  /** An objection during the timelock halts the change. */
  objections: Objection[];

  inForceAt: string | null;
  sources: SourceRef[];
}

export interface Objection {
  scholarId: string;
  reason: string;
  at: string;
}

/**
 * A standing brief on technological change. A ruling attaches to a mechanism
 * as it existed when the ruling was issued; mechanisms change and nobody
 * presently tells a board when they do.
 */
export interface Briefing {
  id: string;
  publishedAt: string;
  title: string;
  /** What changed, mechanically and without evaluation. */
  whatChanged: string;
  /** Why it was changed, in the terms of those who changed it. */
  whyChanged: string;
  /** Which existing rules of this board touch the affected mechanism. */
  touchesRules: string[];
  /** Stated as a question for the board, never as a conclusion. */
  questionForBoard: string;
  sources: SourceRef[];
  raisedBy: 'technical_team' | 'board_member' | 'institution';
}

/** A retained exchange with the comprehension assistant. */
export interface AssistantExchange {
  id: string;
  /**
   * Whose question this was.
   *
   * The text of a member's question is deliberation-adjacent and among the most
   * sensitive this record holds, so it must be able to say which institution it
   * belongs to. Optional because entries written before the field existed carry
   * none; a scoped store returns those only where there is exactly one
   * institution and nothing they could ambiguously belong to.
   */
  institutionId?: string;
  at: string;
  scholarId: string | null;
  question: string;
  answer: string;
  sources: SourceRef[];
  /** Set when the assistant declined because the question sought a ruling. */
  declinedAsRuling: boolean;
  /** Set when the assistant was not confident and referred the question on. */
  escalated: boolean;
  model: string;
  /**
   * Why no answer was given, when none was. `ruling` and `transport` read
   * identically to a user unless they are distinguished here: one means the
   * question was declined on its merits, the other means the check could not
   * be run. Only the second is worth retrying.
   */
  failure?: 'ruling' | 'transport' | 'empty' | null;
  /** Whether retrying is likely to help. Drives the try-again affordance. */
  retryable?: boolean;
  /**
   * The longer explanation. Kept out of `answer` so the interface can show one
   * line and put the reasoning behind a disclosure, rather than confronting a
   * scholar with five lines of policy every time a connection drops.
   */
  detail?: string;
}

/** Read from the deployed Policy Registry contract. */
export interface RegistrySnapshot {
  address: string;
  chainId: number;
  readAt: string;
  reachable: boolean;
  /** Present only when the chain read succeeded. */
  paused?: boolean;
  owner?: string;
  error?: string;
}

/**
 * A reported Shariah non-compliance event.
 *
 * Deliberately not a `Matter`. A matter is a proposal to change a rule and
 * carries a proposed rule, operative parameters and a direction; this is a
 * report of something that has already happened, and what the board does with
 * it is a **determination**, not a vote on terms. Forcing it through the
 * product-approval shape would lose the one thing that makes it different:
 * from the moment the board says the event is actual, a clock runs that the
 * institution is judged on, and nothing about a rule change has that property.
 *
 * The system's authority ends at step two. It may record a determination, run
 * the clock, assemble the submission and total the purification. It may never
 * decide that an event was not actual, and it may never close a determination
 * on the board's behalf.
 */
export interface Incident {
  id: string;
  boardId: string;
  /** How the institution refers to it in its own files. */
  reference: string;
  title: string;
  /** What happened, as reported, with no evaluation in it. */
  report: string;
  reportedBy: string;
  reportedAt: string;

  stage: IncidentStage;

  /** Each signatory's view on whether this is an actual non-compliance. */
  concurrences: Concurrence[];
  /** Set once the board reaches the threshold, either way. */
  determinedAt: string | null;
  /** Null until determined. True is the finding that starts every clock. */
  actual: boolean | null;

  /**
   * What stopped, and everything like it.
   *
   * Recorded at determination rather than left to the bank to remember. A
   * determination that does not name what stops is an opinion, not a finding.
   */
  stopped: string[];

  /**
   * Every plan filed, in order, including those the board sent back.
   *
   * A list rather than a field because a plan the board rejected is part of how
   * the institution responded, and replacing it in place would leave a record
   * in which the institution appears to have got it right first time.
   */
  plans: RectificationPlan[];
  /** The Board of Directors is not this board; it approves after endorsement. */
  directorsApprovedAt: string | null;
  submittedToRegulatorAt: string | null;
  purification: Purification | null;

  closedAt: string | null;
  sources: SourceRef[];
}

export type IncidentStage =
  /** With the board, not yet determined. */
  | 'reported'
  /** Determined not to be a non-compliance. Terminal, and only the board may reach it. */
  | 'not_actual'
  /** Determined actual. The activity has stopped and the clock runs. */
  | 'determined'
  /** The institution has filed a plan to rectify. */
  | 'plan_filed'
  /** The board has endorsed the plan. */
  | 'endorsed'
  /** The Board of Directors has approved it. */
  | 'approved'
  /** Filed with the regulator. */
  | 'submitted'
  /** Rectified and purified. Terminal. */
  | 'closed';

/** One signatory's view on whether an event is an actual non-compliance. */
export interface Concurrence {
  scholarId: string;
  actual: boolean;
  /** Compulsory either way. "Not a breach" needs a reason as much as "breach" does. */
  reason: string;
  at: string;
}

export interface RectificationPlan {
  filedBy: string;
  filedAt: string;
  /** What the institution will do, in order. */
  steps: string[];
  /** When the institution says it will be complete. */
  completeBy: string;
  endorsedBy: string[];
  endorsedAt: string | null;
  /** Present when the board sent it back. A refusal has to say why. */
  returnedReason: string | null;
}

/**
 * Income earned in breach, and where the board directs it.
 *
 * Amounts are strings. Money that has to reconcile with a bank's ledger and
 * appear in an annual disclosure cannot be held in a binary float, and the
 * board prescribes a figure rather than the system computing one.
 */
export interface Purification {
  amount: string;
  currency: string;
  /** Where it goes. The board decides this; the institution does not. */
  destination: string;
  prescribedAt: string;
  paidAt: string | null;
  /** The institution's own reference for the payment. */
  paidReference: string | null;
}

/**
 * Something the board rules on.
 *
 * One type whichever world it is in. A token with a contract address and a
 * sukuk with an ISIN are the same kind of object to a board: something held,
 * with a composition, that a ruling attaches to. Forcing them apart would mean
 * two registers, two status calculations and two places to forget one.
 */
export type AssetKind = 'token' | 'pool' | 'security' | 'instrument' | 'product';

export const ASSET_KINDS: readonly AssetKind[] = [
  'token', 'pool', 'security', 'instrument', 'product',
];

/**
 * One of the names a thing goes by.
 *
 * A list, because one asset genuinely has several: a wrapped token has an
 * address on two chains and a ticker, a sukuk has an ISIN and the bank's own
 * code. Forcing a single identifier means the same instrument entered twice
 * under different schemes, which is the failure the register exists to end.
 */
export interface AssetIdentifier {
  scheme: 'chain' | 'isin' | 'ticker' | 'internal';
  value: string;
  /** Which chain, for a contract address. */
  network?: string;
}

export const IDENTIFIER_SCHEMES: readonly AssetIdentifier['scheme'][] = [
  'chain', 'isin', 'ticker', 'internal',
];

/**
 * What a pool is made of, as at a date.
 *
 * Basis points rather than percentages, and integers rather than floats, for
 * the same reason the screening ratios are: a threshold test that turned on
 * binary rounding would be a ruling decided by IEEE 754.
 *
 * `source` is not decoration. A composition with no source is a number
 * somebody typed, and the board is entitled to know whose figure it is ruling
 * on.
 */
export interface Composition {
  asOf: string;
  source: string;
  parts: CompositionPart[];
}

export interface CompositionPart {
  label: string;
  /** Basis points. The parts are expected to sum to 10 000. */
  bps: number;
  kind: 'tangible' | 'debt' | 'cash' | 'receivable' | 'other';
}

export const PART_KINDS: readonly CompositionPart['kind'][] = [
  'tangible', 'debt', 'cash', 'receivable', 'other',
];

export interface Asset {
  id: string;
  /** Whose it is. Isolation at the store, exactly as everything else. */
  institutionId: string;
  kind: AssetKind;
  name: string;
  identifiers: AssetIdentifier[];

  /**
   * Where the entry came from, which is not the same as who ruled on it.
   *
   * "Nobody has ruled on this" and "nobody has even told us about it" are
   * different states, and a board acting on the first should not be able to
   * mistake it for the second.
   */
  source: 'registry' | 'institution' | 'member';
  addedAt: string;
  addedBy: string | null;

  composition: Composition | null;

  /** Withdrawn from the universe. Kept, never deleted. */
  retiredAt: string | null;
  retiredReason: string | null;
}

/**
 * Derived from the rules in force and the matters open against an asset, never
 * stored. A stored status is a second copy of the truth: a rule is withdrawn
 * and the badge stays green, which is worse than no badge.
 */
export type AssetStatus =
  /** In the register, no ruling, no open matter. Where the work is. */
  | 'never_examined'
  /** A matter naming it is open. */
  | 'under_consideration'
  /** A rule in force permits it. */
  | 'permitted'
  /** A rule in force restricts it. */
  | 'restricted'
  /** A restriction lapsed unratified. Neither restricted nor approved. */
  | 'lapsed'
  /** Withdrawn from the universe. */
  | 'retired';

/**
 * A meeting, as a record rather than as a room.
 *
 * Majlis does not host the call. A conversation on camera is not a record, and
 * a board that decides on one leaves a vote with no reasoning behind it — the
 * failure this whole system exists to replace. What Majlis owns is the minute.
 *
 * It also closes the one clock that has never had anything to count from: the
 * six-month cadence, which the annual report and the calendar both currently
 * report as a gap.
 */
export interface Meeting {
  id: string;
  boardId: string;
  at: string;
  /** Their own tool, in one field. Teams, Zoom, a room with a table. */
  joinUrl: string | null;
  agenda: AgendaItem[];
  attendance: Attendance[];
  /** What was discussed and what was decided. Attributed, like everything. */
  minute: string;
  recordedBy: string;
  closedAt: string | null;
}

export interface AgendaItem {
  /** Set where the item is a matter already before the board. */
  matterId?: string;
  item: string;
}

export interface Attendance {
  scholarId: string;
  present: boolean;
  /** Frameworks that set an attendance floor expect absence to be explicable. */
  note?: string;
}

/**
 * A nominate contract, as a set of conditions a board rules against.
 *
 * The library is a **draft with its source named**, not an assertion of what
 * the Shariah requires. Boards differ, and a system that shipped its own
 * reading as settled would be ruling. What is binding is the board's finding;
 * this is the prompt that makes the finding orderly.
 */
export interface Structure {
  id: string;
  name: string;
  /**
   * Grouped so a board picking a shape reads a short list rather than a wall.
   *
   * 'support' is the cluster that secures or moves an obligation without being
   * the transaction itself — guarantee, pledge, assignment, promise. 'combination'
   * has one member and earns it: combining contracts is where most structures
   * actually fail, and it is a shape in its own right rather than a note on the
   * others.
   */
  family:
    | 'sale'
    | 'lease'
    | 'partnership'
    | 'agency'
    | 'security'
    | 'exchange'
    | 'gratuitous'
    | 'support'
    | 'protection'
    | 'combination';
  conditions: StructureCondition[];
  /** Which calculations this shape normally attracts. */
  calculations: CalculationKind[];
  /** Where the conditions are drawn from, for the board to confirm. */
  authority: string;
}

export interface StructureCondition {
  id: string;
  /** What must be true. */
  requirement: string;
  /**
   * What goes wrong when it is not.
   *
   * A condition stated without its reason can only be accepted or rejected on
   * authority. Stated with it, a scholar can disagree with the reasoning, which
   * is the argument a board should be having.
   */
  why: string;
  /** How it is shown: a document, an order of events, a figure, an undertaking. */
  evidence: 'document' | 'sequence' | 'figure' | 'undertaking';
  authority: string;
}

/**
 * One board member's finding on one condition.
 *
 * `not_applicable` is a real answer rather than a way out — many conditions
 * genuinely do not bear on a given product, and forcing a met/not-met choice
 * would put a false finding in the record.
 */
export interface ConditionFinding {
  conditionId: string;
  holds: 'met' | 'not_met' | 'not_applicable';
  /** Compulsory, in all three directions. A finding without a reason is a tick. */
  reason: string;
  scholarId: string;
  at: string;
  /** Set when a later finding from the same member replaced this one. */
  supersededAt?: string | null;
}

/** What a calculation is for. The kinds the toolkit knows about. */
export type CalculationKind =
  | 'screening'
  | 'purification'
  | 'zakat'
  | 'profit_distribution'
  | 'tangibility'
  | 'late_payment';

/**
 * A calculation, recorded against a period.
 *
 * The four calculations compute statelessly, and that was the right default:
 * the figures belong to the institution, and a system that held them would be
 * asserting numbers it cannot audit. But it left the annual report unable to
 * state zakat, the calendar unable to carry a hawl, and a scholar unable to
 * point at what the board was shown last quarter.
 *
 * ── what this is, and what it is not ──────────────────────────────────────
 *
 * It is a record **that the board was shown these figures, from this source,
 * and that this arithmetic followed from them.** It is not a claim the figures
 * are true — the same line the record already takes with evidence, where a
 * source is held with its citation and never restated as this system's own.
 *
 * And recording is **not approving**. A computation is a fact; whether the
 * method was the right one is a ruling, and a ruling goes through the ordinary
 * process. Nothing here says a board agreed with what it noted.
 *
 * ── append-only, like everything else in the record ───────────────────────
 *
 * A corrected figure does not edit a computation. It produces a new one naming
 * the old in `supersedes`, and the old one stays — because somebody may have
 * acted on it. Which computations are superseded is derived by looking, never
 * stored, so the two can never disagree.
 *
 * Withdrawal is separate and rarer: a computation recorded against the wrong
 * holding cannot be superseded by a right one, since they are about different
 * things. It is marked withdrawn, with a reason and a name, and never deleted.
 */
export interface Computation {
  id: string;
  kind: CalculationKind;
  boardId: string;
  /**
   * The holding it concerns, where it concerns one.
   *
   * Screening and purification are about a holding. Zakat and profit
   * distribution are about the institution, and carry null rather than being
   * attached to an arbitrary asset to make the shape uniform.
   */
  assetId: string | null;

  /**
   * What period it covers.
   *
   * Required, and the reason the whole record exists: a computation with no
   * period cannot be compared with the one before it, cannot be found when the
   * annual report asks for the year, and cannot be shown to have been done.
   */
  periodFrom: string;
  periodTo: string;

  /** The method the board applied: the key it was sent as, and in words. */
  method: string;
  methodStated: string;

  currency: string;
  /** Who supplied the figures, in their words. Never restated as this system's. */
  source: string;

  /**
   * The figures as supplied.
   *
   * Held so the arithmetic can be checked, and so a later reader can run it
   * again and see whether the answer still comes out the same. A difference
   * would be a finding rather than a fault: either the service changed or the
   * record did.
   */
  figures: Record<string, string | number | boolean | null>;

  /**
   * The answer and its working, exactly as the service produced them.
   *
   * Stored rather than recomputed on read, because what matters for an audit is
   * what the board was actually shown. If a later version of the arithmetic
   * disagrees, the record must still say what was in front of them at the time.
   */
  headline: string;
  amount: string;
  steps: { label: string; working: string; value: string }[];
  /** The sentence saying what the calculation did not answer. */
  note: string;

  recordedBy: string;
  recordedAt: string;

  /** The computation this replaces. The replaced one is not removed. */
  supersedes: string | null;

  /** Withdrawn rather than deleted, like a released vote or a cited source. */
  withdrawnAt: string | null;
  withdrawnBy: string | null;
  withdrawalReason: string | null;
}

/**
 * A shape as the board took it, rather than as it was shipped.
 *
 * The library is a draft. Until a board has done something with a shape, its
 * conditions are somebody else's reading — offered so a scholar stops composing
 * a question from an empty box, and binding on nobody.
 *
 * Adoption is what changes that. The board takes a shape, amends what it
 * disagrees with, and thereafter the checklist runs against **their** version.
 * Nothing in the library moves; what changes is which version a matter is
 * judged by.
 *
 * ── one shape at a time, and always under a decision ──────────────────────
 *
 * **Per shape.** No board approves nineteen contracts in a sitting. They adopt
 * the ones they use, and a system that made it all-or-nothing would either be
 * ignored or waved through.
 *
 * **Under a matter.** "As a matter like any other" is the whole design: a
 * settled decision of this board is named, and one that is still being argued
 * about is not enough. Without that, adoption would be a switch anybody on the
 * board could flip, and the library would become binding by administration.
 *
 * ── and it is append-only, like everything else here ──────────────────────
 *
 * An amendment does not edit an adoption. It supersedes it, naming the one it
 * replaces and the matter that decided it, and the earlier version stays —
 * because findings were recorded against it and a reader has to be able to see
 * what the board was working from at the time.
 */
export interface AdoptedStructure {
  id: string;
  boardId: string;
  /** The library shape this is the board's version of. */
  structureId: string;

  /**
   * How the board took it.
   *
   * `adopted` — taken as shipped. `amended` — taken with changes, which are in
   * `conditions`. `declined` — the board ruled against using this shape, and
   * the checklist should not offer it as though nothing had been said.
   */
  standing: 'adopted' | 'amended' | 'declined';

  /**
   * The conditions as the board holds them.
   *
   * Empty on a decline. On an adoption without changes this is a copy of the
   * library's conditions at the time — copied rather than referenced, so a
   * later change to the shipped library cannot silently change what a board
   * adopted two years ago.
   */
  conditions: StructureCondition[];

  /** What the board changed and why, in their words. Empty on a plain adoption. */
  amendments: string[];

  /** The settled matter this was decided in. Required, and checked. */
  matterId: string;

  decidedBy: string;
  decidedAt: string;

  /** The adoption this replaces. The replaced one stays. */
  supersedes: string | null;
}
