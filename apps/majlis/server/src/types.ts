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

export interface Board {
  id: string;
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

  /** What is proposed, in ordinary language. */
  proposal: string;
  /** What is expressly NOT being decided. Prevents narrow approvals being
   *  later treated as broad endorsements. */
  notDecided: string[];
  /** What mechanically occurs when the rule applies. */
  mechanism: string;
  /** Rules this interacts with or would supersede. */
  interactsWith: string[];

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
