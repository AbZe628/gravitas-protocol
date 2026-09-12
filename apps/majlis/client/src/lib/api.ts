
export interface Rule {
  id: string;
  boardId: string;
  title: string;
  statement: string;
  parameters: RuleParameter[];
  parameterHash: string;
  parameterHashVerified?: boolean;
  version: number;
  inForceFrom: string | null;
  sources: SourceRef[];
}

export interface MatterSummary {
  id: string;
  title: string;
  origin: string;
  direction: 'permit' | 'restrict';
  status: string;
  openedAt: string;
  timelockEndsAt: string | null;
  affected: number | null;
  deliberationCount: number;
}

export interface SimulatedTransaction {
  hash: string;
  at: string;
  asset: string;
  valueUsd: number;
  reason: string;
}

export interface Simulation {
  windowFrom: string;
  windowTo: string;
  transactionsExamined: number;
  transactionsAffected: number;
  affectedSample: SimulatedTransaction[];
  note: string;
}

/**
 * A piece of the body, with the names in it already resolved.
 *
 * Parsed on the server rather than here. The rule — an `@` starting a word,
 * followed by the id of somebody on this board — is small enough that an
 * interface could apply it itself, and that is exactly how two copies of a
 * rule come to disagree.
 */
export interface Segment {
  text: string;
  /** Set where this segment names somebody on the board. */
  scholarId?: string;
}

export interface Deliberation {
  id: string;
  scholarId: string;
  body: string;
  at: string;
  replyTo: string | null;
  liaisonAnswer: boolean;
  /** Absent on entries loaded from a list rather than from one matter. */
  segments?: Segment[];
}

export type SourceKind = 'standard' | 'ruling' | 'document' | 'external' | 'code' | 'test' | 'chain';

export const SOURCE_KINDS: readonly SourceKind[] = [
  'standard', 'ruling', 'document', 'external', 'code', 'test', 'chain',
];

export interface SourceRef {
  kind: SourceKind;
  label: string;
  ref: string;
  id?: string;
  addedBy?: string | null;
  at?: string;
  note?: string;
  /** Set when withdrawn. It stops counting and stays visible. */
  withdrawnAt?: string | null;
  /**
   * Set where the source is an uploaded document rather than a citation.
   *
   * `key` is the SHA-256 of the bytes, which is also the reference: it names
   * the file and proves what it holds. It is never a URL — a document is
   * reached through the source that cites it, so one institution cannot read
   * another's by holding a key.
   */
  file?: { name: string; bytes: number; mediaType: string; key: string } | null;
}

export interface RuleParameter {
  key: string;
  value: string;
  unit?: string;
  meaning: string;
}

export interface Reasoning {
  scholarId: string;
  position: 'for' | 'against' | 'abstain';
  reason: string;
  at: string;
  /** The terms this position was taken on. Lets "did they approve these exact terms" be checked. */
  onParameterHash?: string;
  /** Set when the matter returned to deliberation. The position stays; it stops counting. */
  releasedAt?: string | null;
}

export interface Matter extends MatterSummary {
  boardId: string;
  /**
   * Who may be named in this deliberation.
   *
   * The composer offers these and nothing else. A free-text `@` that named
   * nobody would look like a question asked and answered by nobody.
   */
  mentionable?: { id: string; name: string; title: string }[];
  proposal: string;
  notDecided: string[];
  /**
   * The contract shape this matter is judged against, where the board chose one.
   *
   * Absent on matters that are not about a structure at all. The draft-clauses
   * link is offered only where it is present, because the route refuses
   * otherwise and a link that leads to a refusal is a link that lied.
   */
  structureId?: string;
  mechanism: string;
  interactsWith: string[];
  proposedRule: Rule;
  simulation: Simulation | null;
  deliberation: Deliberation[];
  reasoning: Reasoning[];
  objections: { scholarId: string; reason: string; at: string }[];
  inForceAt: string | null;
  sources: SourceRef[];
}

export interface Briefing {
  id: string;
  publishedAt: string;
  title: string;
  whatChanged: string;
  whyChanged: string;
  touchesRules: string[];
  questionForBoard: string;
  sources: SourceRef[];
  raisedBy: 'technical_team' | 'board_member' | 'institution';
}

export interface Board {
  id: string;
  name: string;
  quorumPermit: number;
  quorumRestrict: number;
  totalSignatories: number;
  ratificationWindowHours: number;
  members: { id: string; name: string; title: string; signatory: boolean }[];
}

export interface RegistrySnapshot {
  address: string;
  chainId: number;
  readAt: string;
  reachable: boolean;
  paused?: boolean;
  owner?: string;
  error?: string;
}

export interface AssistantExchange {
  id: string;
  at: string;
  question: string;
  answer: string;
  sources: SourceRef[];
  declinedAsRuling: boolean;
  escalated: boolean;
  model: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export interface Health {
  ok: boolean;
  stage: number;
  governanceWrites: boolean;
  signingAuthority: boolean;
  /** When the record began, or null if the store cannot say. */
  recordSince: string | null;
  /**
   * What this installation has attached. A board inside a bank runs with
   * neither, and that is the ordinary installation rather than a degraded one —
   * so the interface must not offer what is not there.
   */
  enforcement?: 'none' | 'gravitas-registry';
  assistantKind?: 'off' | 'anthropic';
  /**
   * Whether a document can be kept at all.
   *
   * Read before offering to take one. An upload control on an installation
   * with no volume is a control that lies, and the lie is only discovered when
   * a board tries to cite what it uploaded.
   */
  documents?: 'disk' | 'none';
  /**
   * Whether an attached document may be read by a model.
   *
   * A separate decision from whether there is an assistant, and separately off.
   * The control appears only where this says it can work.
   */
  reading?: 'off' | 'anthropic';
  /**
   * Whether a member may speak their reasoning rather than type it.
   *
   * Off unless the institution chose it, because the browser sends the
   * recording away to be transcribed and a stated reason for a vote is more
   * sensitive than a question to the assistant.
   */
  dictation?: 'off' | 'browser';
  /** Where the audio goes, in the server's words. Shown before the first use. */
  dictationNote?: string;
}

export interface EnforcementSnapshot {
  kind: 'none' | 'gravitas-registry';
  configured: boolean;
  readAt: string;
  label?: string;
  reachable?: boolean;
  paused?: boolean;
  owner?: string;
  address?: string;
  chainId?: number;
  error?: string;
}

/**
 * Who you are, and what this copy can honestly offer you.
 *
 * `stillOnTheSeed` is null where this copy holds no credentials at all — a
 * development copy where everyone reads and nobody acts. Null and false are
 * different answers, and the screen shows them differently.
 */
export interface Me {
  scholarId: string;
  role: string;
  office: 'chair' | 'secretary' | null;
  stillOnTheSeed: boolean | null;
  passwordMinimum: number;
  /** False where nobody can be let back in, because nothing holds a password. */
  resetsPossible: boolean;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    // The server's own words, which say what was refused and why. A status
    // line would tell a member nothing they can act on.
    let message = res.statusText;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* not JSON: the status line is all there is */
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/**
 * A member's own account.
 *
 * Apart from the store and the routes, this is the whole of it: nothing here
 * caches an identity, because a password change has to be reflected by the
 * next request rather than by a page the interface remembers.
 */
export const account = {
  me: () => get<Me>('/api/me'),

  changePassword: (current: string, next: string) =>
    post<{ scholarId: string; setAt: string }>('/api/me/password', { current, next }),

  /**
   * Issue a code for somebody who has forgotten theirs.
   *
   * `issued` comes back false, with no code, where nobody holds a credential
   * for that member — the same shape as a success, so the door cannot be used
   * to read a board's membership.
   */
  issueReset: (scholarId: string) =>
    post<{ issued: boolean; code?: string; expiresAt?: string; message: string }>(
      '/api/members/reset',
      { scholarId },
    ),

  /** Set a new password with a code. Takes no credential, by design. */
  redeemReset: (scholarId: string, code: string, next: string) =>
    post<{ scholarId: string; setAt: string }>('/api/members/password/reset', {
      scholarId,
      code,
      next,
    }),
};

export const api = {
  health: () => get<Health>('/api/health'),
  boards: () => get<Board[]>('/api/boards'),
  board: (id: string) => get<Board>(`/api/boards/${id}`),
  matters: () => get<MatterSummary[]>('/api/matters'),
  matter: (id: string) => get<Matter>(`/api/matters/${id}`),
  /**
   * Everything for one matter, in the order it is read.
   *
   * One call where the screen used to make five. The assembly is the server's,
   * so two screens cannot disagree about what a matter's precedent is.
   */
  pack: (id: string) => get<Pack>(`/api/matters/${id}/pack`),
  /**
   * Everything for one sitting, in one document.
   *
   * What a director is handed before a meeting by every board portal sold to
   * corporate boards, and the last of those this application did not have.
   */
  book: (meetingId: string) => get<BoardBook>(`/api/meetings/${meetingId}/book`),
  rules: () => get<Rule[]>('/api/rules'),
  briefings: () => get<Briefing[]>('/api/briefings'),
  enforcement: () => get<EnforcementSnapshot>('/api/enforcement'),
  assistantLog: () => get<AssistantExchange[]>('/api/assistant/log'),
  exportBoard: (id: string) => get<unknown>(`/api/export/${id}`),

  async ask(question: string, context?: string): Promise<AssistantExchange> {
    const res = await fetch('/api/assistant/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as AssistantExchange;
  },
};

// ── Stage Two ─────────────────────────────────────────────────────────────

export type Role = 'signatory' | 'advisory' | 'liaison' | 'observer' | 'institution';

export interface Tally {
  for: number;
  against: number;
  abstain: number;
  required: number;
  met: boolean;
  outstanding: string[];
}

export type AttentionKind =
  | 'awaiting_your_deliberation'
  | 'awaiting_your_vote'
  | 'objection_window_open'
  | 'ready_to_take_effect'
  | 'awaiting_ratification'
  | 'overdue'
  /** A colleague named you. The one kind here with no clock behind it. */
  | 'mentioned_you';

export interface AttentionItem {
  matterId: string;
  boardId: string;
  title: string;
  status: string;
  direction: 'permit' | 'restrict';
  kind: AttentionKind;
  deadline: string | null;
  hoursRemaining: number | null;
  overdue: boolean;
  note: string;
}

export interface Attention {
  scholarId: string;
  role: Role;
  /** Held, not ranked. Null for most members, which is the normal case. */
  office?: 'chair' | 'secretary' | null;
  outstanding: number;
  overdue: number;
  items: AttentionItem[];
}

/**
 * A refusal from the server is not a failure of the server. It is the process
 * saying no, and the reason it gives is written to be read by a scholar rather
 * than by a developer. Carrying the message through unchanged is the whole
 * point; replacing it with "something went wrong" would throw away the only
 * part that helps.
 */
export class Refused extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'Refused';
  }
}

/**
 * A note one member left on a passage of something the board is reading.
 *
 * `at` is where the passage sits in the text *as the server just found it*,
 * never where it sat when the note was written — an offset kept from then
 * would point at whatever moved into its place.
 */
export interface Annotation {
  id: string;
  boardId: string;
  on: 'proposal' | 'briefing' | 'document';
  subjectId: string;
  quote: string;
  at: number;
  said: string;
  by: string;
  atTime: string;
  replyTo?: string;
  withdrawn?: { by: string; at: string };
  /** The member's name, added by the route. */
  whoName?: string;
}

export interface AnnotationThread {
  note: {
    annotation: Annotation;
    /** Null where the passage is no longer in the text. */
    at: number | null;
    adrift: boolean;
  };
  replies: Annotation[];
  whoName: string;
}

export interface Margin {
  on: 'proposal' | 'briefing' | 'document';
  subjectId: string;
  threads: AnnotationThread[];
  summary: { standing: number; withdrawn: number; adrift: number; by: string[] };
  /**
   * The words the passages were checked against.
   *
   * Rendered from this rather than from the copy the screen already holds:
   * two copies of a document disagreeing about where a sentence is, is how a
   * note ends up beside the wrong one.
   */
  text: string;
}

/** Some of the board, given a question to look at first. It never rules. */
export interface Committee {
  id: string;
  boardId: string;
  name: string;
  remit: string;
  members: string[];
  convenor?: string;
  formedIn: string;
  formedAt: string;
  dissolvedAt?: string;
}

export interface Referral {
  id: string;
  boardId: string;
  committeeId: string;
  matterId: string;
  asking: string;
  referredBy: string;
  referredAt: string;
  report?: {
    found: string;
    by: string;
    at: string;
    standing: { scholarId: string; agrees: boolean; said?: string; at: string }[];
  };
  withdrawn?: { by: string; at: string; why: string };
}

/**
 * How a committee stood behind its own account.
 *
 * Named, never counted: "four agreed" tells a board nothing it can act on, and
 * "Board Member C did not, because …" is the sentence it has to read.
 */
export interface HowItStood {
  unanimous: boolean;
  agreedNames: string[];
  dissentedNames: { scholarId: string; said: string; name: string }[];
  silentNames: string[];
}

export interface ReferralOnMatter {
  referral: Referral;
  committee: Committee | null;
  state: 'waiting' | 'reported' | 'withdrawn';
  referredByName: string;
  stood: HowItStood | null;
}

async function send<T>(
  path: string,
  body?: unknown,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    // A DELETE with a body confuses proxies more often than it helps.
    body: method === 'DELETE' ? undefined : JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    let payload: { error?: string; message?: string } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      // A response with no JSON body: fall through to the status.
    }
    throw new Refused(
      payload.error ?? 'unknown',
      payload.message ?? `The change was not made (${res.status}).`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export type MatchField =
  | 'title' | 'proposal' | 'rule' | 'parameter'
  | 'source' | 'reasoning' | 'deliberation' | 'mechanism' | 'notDecided';

export interface Match {
  field: MatchField;
  snippet: string;
  by?: string;
}

export interface SearchHit {
  matterId: string;
  boardId: string;
  title: string;
  status: string;
  direction: 'permit' | 'restrict';
  origin: string;
  openedAt: string;
  inForceAt: string | null;
  score: number;
  matches: Match[];
}

export interface SearchResult {
  query: string;
  count: number;
  hits: SearchHit[];
}

export interface SearchQuery {
  q?: string;
  status?: string[];
  direction?: string;
  member?: string;
  from?: string;
}

export type RelationKind = 'same_source' | 'declared' | 'same_parameter';

export interface Related {
  matterId: string;
  title: string;
  status: string;
  direction: 'permit' | 'restrict';
  openedAt: string;
  inForceAt: string | null;
  relations: { kind: RelationKind; shared: string }[];
}

export const governance = {
  attention: () => get<Attention>('/api/attention'),

  /** Search the record. A query of only filters is valid. */
  search: (query: SearchQuery) => {
    const p = new URLSearchParams();
    if (query.q) p.set('q', query.q);
    if (query.status?.length) p.set('status', query.status.join(','));
    if (query.direction) p.set('direction', query.direction);
    if (query.member) p.set('member', query.member);
    if (query.from) p.set('from', query.from);
    return get<SearchResult>('/api/search?' + p.toString());
  },

  /** What the board already decided that bears on this matter. */
  related: (id: string) => get<Related[]>(`/api/matters/${id}/related`),
  tally: (id: string) => get<Tally>(`/api/matters/${id}/tally`),

  openMatter: (input: {
    boardId: string;
    title: string;
    proposal: string;
    direction: 'permit' | 'restrict';
    origin: string;
    mechanism?: string;
    notDecided?: string[];
  /** When the institution asked. Absent where nobody knows, never defaulted. */
  arrivedAt?: string;
    /** What it is about. The link that makes the two outputs one thing. */
    assetIds?: string[];
  }) => send<Matter>('/api/matters', input),

  openDeliberation: (id: string) => send<Matter>(`/api/matters/${id}/open`),
  say: (id: string, body: string, replyTo?: string | null) =>
    send<Matter>(`/api/matters/${id}/deliberation`, { body, replyTo: replyTo ?? null }),

  openVoting: (id: string) => send<Matter>(`/api/matters/${id}/voting`),
  vote: (id: string, position: 'for' | 'against' | 'abstain', reason: string) =>
    send<Matter>(`/api/matters/${id}/vote`, { position, reason }),
  closeVoting: (id: string) => send<Matter & { outcome: string }>(`/api/matters/${id}/close`),

  /** Return an open vote to deliberation. Every position cast on it is released. */
  reopen: (id: string, reason: string) => send<Matter>(`/api/matters/${id}/reopen`, { reason }),

  /** Attach a source. Anyone who may deliberate. */
  attachSource: (id: string, source: { kind: SourceKind; label: string; ref: string; note?: string }) =>
    send<Matter>(`/api/matters/${id}/sources`, source),

  /**
   * Attach a document rather than a citation.
   *
   * The bytes go up raw with their type in the header — one file per request,
   * which is what the route takes. What comes back is an ordinary source of
   * kind 'document' carrying the file, so everything already written about
   * sources applies to it without a second path through the record.
   */
  async attachDocument(
    id: string,
    file: File,
    label: string,
    note?: string,
  ): Promise<Matter> {
    const query = new URLSearchParams({ label, name: file.name });
    if (note?.trim()) query.set('note', note.trim());

    const res = await fetch(`/api/matters/${id}/sources/file?${query.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!res.ok) {
      let payload: { error?: string; message?: string } = {};
      try {
        payload = (await res.json()) as typeof payload;
      } catch {
        // A response with no JSON body: fall through to the status.
      }
      throw new Refused(
        payload.error ?? 'unknown',
        payload.message ?? `The document was not attached (${res.status}).`,
        res.status,
      );
    }
    return (await res.json()) as Matter;
  },

  /** Withdraw one you attached. Withdrawn, not deleted. */
  withdrawSource: (id: string, sourceId: string) =>
    send<Matter>(`/api/matters/${id}/sources/${sourceId}`, undefined, 'DELETE'),

  /** Where a document lives. Opened, never fetched — it downloads. */
  documentHref: (matterId: string, sourceId: string) =>
    `/api/matters/${matterId}/sources/${sourceId}/file`,

  /** Set the operative terms. Refused once a vote is open. */
  setParameters: (id: string, parameters: RuleParameter[]) =>
    send<Matter>(`/api/matters/${id}/parameters`, { parameters }, 'PUT'),

  object: (id: string, reason: string) => send<Matter>(`/api/matters/${id}/object`, { reason }),
  bringIntoForce: (id: string) => send<Matter>(`/api/matters/${id}/force`),
  withdraw: (id: string) => send<Matter>(`/api/matters/${id}/withdraw`),
};

// ── the clocks ────────────────────────────────────────────────────────────

export type WaitPhase =
  | 'unopened'
  | 'deliberation'
  | 'voting'
  | 'timelock'
  | 'ratification'
  | 'settled';

export interface Wait {
  matterId: string;
  boardId: string;
  title: string;
  status: string;
  phase: WaitPhase;
  hours: number;
  days: number;
  /** True where the wait covers only the part this system witnessed. */
  partial: boolean;
  inferredSettlement: boolean;
  waitingOn: string[];
  /** True when nothing is required of anyone and only time is passing. */
  onTheClock: boolean;
  note: string;
}

export interface BoardPace {
  boardId: string;
  settled: number;
  medianDays: number | null;
  fastestDays: number | null;
  slowestDays: number | null;
  open: number;
  longestOpen: Wait | null;
  approximate: boolean;
}

export interface PaceResponse {
  asOf: string;
  boards: BoardPace[];
  waiting: Wait[];
}

// ── periodic review ───────────────────────────────────────────────────────

export type ReviewState = 'scheduled' | 'due' | 'unscheduled' | 'not_applicable';

export interface ReviewStatus {
  ruleId: string;
  boardId: string;
  title: string;
  state: ReviewState;
  everyMonths: number | null;
  dueAt: string | null;
  daysUntilDue: number | null;
  overdue: boolean;
  note: string;
}

export interface ReviewsResponse {
  asOf: string;
  due: number;
  unscheduled: number;
  items: ReviewStatus[];
}

// ── reported non-compliance ───────────────────────────────────────────────

export type IncidentStage =
  | 'reported'
  | 'not_actual'
  | 'determined'
  | 'plan_filed'
  | 'endorsed'
  | 'approved'
  | 'submitted'
  | 'closed';

export interface RectificationClock {
  deadline: string;
  daysRemaining: number;
  overdue: boolean;
  planFiled: boolean;
  note: string;
}

export interface Concurrence {
  scholarId: string;
  actual: boolean;
  reason: string;
  at: string;
}

export interface RectificationPlan {
  filedBy: string;
  filedAt: string;
  steps: string[];
  completeBy: string;
  endorsedBy: string[];
  endorsedAt: string | null;
  returnedReason: string | null;
}

export interface Purification {
  amount: string;
  currency: string;
  destination: string;
  prescribedAt: string;
  paidAt: string | null;
  paidReference: string | null;
}

export interface Incident {
  id: string;
  boardId: string;
  reference: string;
  title: string;
  report: string;
  reportedBy: string;
  reportedAt: string;
  stage: IncidentStage;
  concurrences: Concurrence[];
  determinedAt: string | null;
  actual: boolean | null;
  stopped: string[];
  plans: RectificationPlan[];
  directorsApprovedAt: string | null;
  submittedToRegulatorAt: string | null;
  purification: Purification | null;
  closedAt: string | null;
  /** Present on a single incident read. */
  plan?: RectificationPlan | null;
  clock?: RectificationClock | null;
}

export interface IncidentList {
  asOf: string;
  count: number;
  awaitingDetermination: number;
  overdue: number;
  incidents: Incident[];
}

// ── what this board already decided about a question of this shape ────────

export type ProposalKind = 'condition' | 'term' | 'not_decided' | 'mechanism';

export interface Proposal {
  kind: ProposalKind;
  /** Which condition, or which term. Absent for prose. */
  key?: string;
  /** What the board said last time, verbatim. */
  value: string;
  holds?: 'met' | 'not_met' | 'not_applicable';
  unit?: string;
}

export interface Inheritance {
  matterId: string;
  from: { id: string; title: string; decidedAt: string | null } | null;
  /** Why that matter and not another. Named, never a resemblance. */
  because: string | null;
  /** Including the one being drafted: "the fourth this board has ruled on". */
  timesRuled: number;
  proposals: Proposal[];
  note: string;
  /** What the checklist should say while a draft is unread. */
  checklist: string;
}

// ── what the terms will do once ruled ─────────────────────────────────────

/** When a term is tested against reality. The distinction the panel is for. */
/**
 * `CheckCadence`, not `Cadence`.
 *
 * Meetings already own that name for how often a board must sit, and the two
 * are different clocks. TypeScript caught the collision, which the i18n
 * dictionaries would not have.
 */
export type CheckCadence = 'before_every_transaction' | 'when_someone_looks' | 'unknown';

export interface TermCarried {
  key: string;
  value: string;
  unit?: string;
  /** The board's own words. Never rewritten. */
  meaning: string;
  /** What this term does when it is not met, where the term says so. */
  onBreach: string | null;
}

export interface Carrying {
  matterId: string;
  attached: boolean;
  /** What carries it out, in its own words. Null where nothing is attached. */
  carrier: string | null;
  cadence: CheckCadence;
  whenChecked: string;
  drift: string;
  terms: TermCarried[];
  /** What Majlis cannot see about this, named rather than glossed. */
  limits: string[];
}

// ── the passage a matter makes ────────────────────────────────────────────

export type StepState = 'done' | 'open' | 'ahead' | 'skipped' | 'not_applicable';

/** Whose act it is. Named on every step, because that is how matters stall. */
export type Whose = 'board' | 'signatory' | 'liaison' | 'institution' | 'software' | 'clock';

export interface PassageStep {
  key: string;
  act: string;
  whose: Whose;
  state: StepState;
  at: string | null;
  /** What is in the way, in plain words, or null. */
  standing: string | null;
  /** Whether the system actually refuses to go on without this. */
  enforced: boolean;
  why: string;
}

export interface Passage {
  matterId: string;
  /** A set. The order is the work's, not ours. */
  shaping: PassageStep[];
  /** A sequence. The lifecycle refuses to reorder it. */
  deciding: PassageStep[];
  /** The one act to do next, or null where the matter is settled. */
  next: PassageStep | null;
  waiting: { days: number; since: string; on: Whose; note: string } | null;
  settled: string | null;
}

// ── late payment ──────────────────────────────────────────────────────────

export type LateMethod = 'stipulated_amount' | 'rate_on_overdue';

/** Whether the board permits the institution to keep anything at all. */
export type Retention = 'nothing' | 'evidenced_costs';

/** What the board established about the debtor. Recorded, never acted on. */
export type Solvency = 'able_and_delaying' | 'unable' | 'not_determined';

export interface CollectionCost {
  description: string;
  amount: string;
}

export interface LatePaymentInput {
  method: LateMethod;
  currency: string;
  source: string;
  obligation: string;
  dueOn: string;
  paidOn: string;
  solvency: Solvency;
  retention: Retention;
  stipulated?: string;
  outstanding?: string;
  rateBps?: number | null;
  dayCount?: 360 | 365;
  costs?: CollectionCost[];
}

export interface LatePayment {
  method: LateMethod;
  methodStated: string;
  currency: string;
  source: string;
  obligation: string;
  dueOn: string;
  paidOn: string;
  daysLate: number;
  solvency: Solvency;
  solvencyStated: string;
  /** Present where the answer means the charge may not be due at all. */
  solvencyWarning: string | null;
  retention: Retention;
  retentionStated: string;
  charged: string;
  retained: string;
  /** Everything not retained. This is the figure purification takes. */
  toBeGivenAway: string;
  steps: CalcStep[];
  note: string;
}

// ── tradability ───────────────────────────────────────────────────────────

export type PartKind = 'tangible' | 'debt' | 'cash' | 'receivable' | 'other';

export const PART_KINDS: readonly PartKind[] = ['tangible', 'debt', 'cash', 'receivable', 'other'];

export interface CompositionPart {
  label: string;
  /** Basis points. The parts must sum to 10 000. */
  bps: number;
  kind: PartKind;
}

/**
 * One band of the board's rule, in the board's own words.
 *
 * `fromBps` inclusive, `toBps` exclusive, so adjacent bands meet without
 * overlapping and a proportion on a boundary belongs to the band above.
 */
export interface TradabilityBand {
  fromBps: number;
  toBps: number;
  /** What the board said happens here. Quoted, never paraphrased. */
  consequence: string;
}

export interface TradabilityInput {
  asOf: string;
  source: string;
  parts: CompositionPart[];
  /** Which kinds this board counts on the tangible side. Never inferred. */
  countsAsTangible: PartKind[];
  bands: TradabilityBand[];
  authority: string;
}

export interface Tradability {
  asOf: string;
  source: string;
  authority: string;
  countsAsTangible: PartKind[];
  byKind: { kind: PartKind; bps: number; percent: string }[];
  countedBps: number;
  countedPercent: string;
  /** The board's sentence for this band, or null where the rule does not reach. */
  band: TradabilityBand | null;
  /** Said when `band` is null. Names the hole rather than filling it. */
  unstated: string | null;
  steps: CalcStep[];
  /** Standards governing this composition whatever the proportion says. */
  alsoGovernedBy: string[];
  note: string;
}

// ── screening ─────────────────────────────────────────────────────────────

export interface Figures {
  asOf: string;
  source: string;
  currency: string;
  marketCapitalisation: string;
  interestBearingDebt: string;
  cashAndInterestBearingSecurities: string;
  totalRevenue: string;
  nonPermissibleIncome: string;
  /** The limits this board set. There are no shipped ones to fall back on. */
  thresholds?: Threshold[];
}

/** One limit, as this board set it. `basis` is the board's own words. */
export interface Threshold {
  key: 'debt' | 'liquidity' | 'income';
  thresholdBps: number;
  bound: 'at_or_below' | 'strictly_below';
  basis?: string;
}

export interface RatioResult {
  key: 'debt' | 'liquidity' | 'income';
  label: string;
  numerator: string;
  denominator: string;
  valueBps: number | null;
  percent: string | null;
  withinThreshold: boolean | null;
  workings: string;
  thresholdBps: number | null;
  bound: 'at_or_below' | 'strictly_below' | null;
  basis: string | null;
  /** Which silence this is: a figure that could not divide, or no limit given. */
  unknownBecause: 'denominator_is_zero' | 'no_limit_set' | null;
}

export interface Assessment {
  asOf: string;
  source: string;
  currency: string;
  ratios: RatioResult[];
  allWithinThresholds: boolean | null;
  /** How many of the three this board has actually set a limit for. */
  limitsSet: number;
  note: string;
}

export interface Crossing {
  key: string;
  label: string;
  direction: 'into_breach' | 'back_within';
  was: string | null;
  now: string | null;
  questionForBoard: string;
}

// ── the calculations a board runs on its own figures ──────────────────────

/**
 * All three share a shape, and the shape is the argument.
 *
 * Every one of them returns `steps` — the sums written out — and a `note`
 * saying what it did not answer. Nothing returns a verdict, and nothing here
 * assembles one from the parts.
 */
export interface CalcStep {
  label: string;
  working: string;
  value: string;
}

export type PurificationMethod = 'per_share' | 'per_dividend' | 'per_unit';

export interface PurificationInput {
  method: PurificationMethod;
  periodFrom: string;
  periodTo: string;
  currency: string;
  source: string;
  basis: string;
  unitsHeld: string;
  nonPermissibleIncome?: string;
  sharesOutstanding?: string;
  totalIncome?: string;
  incomeReceived?: string;
  ratePerUnit?: string;
  apportionByHoldingPeriod?: boolean;
  daysHeld?: number;
  daysInPeriod?: number;
}

export interface Purified {
  method: PurificationMethod;
  methodStated: string;
  basis: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
  source: string;
  amount: string;
  perUnit: string | null;
  proportionOfReceiptsBps: number | null;
  steps: CalcStep[];
  note: string;
}

export type ZakatMethod = 'net_assets' | 'net_invested_funds';
export type ZakatYear = 'lunar' | 'solar';
export type BorneBy = 'institution' | 'shareholders' | 'both';

export interface ZakatInput {
  method: ZakatMethod;
  year: ZakatYear;
  borneBy: BorneBy;
  hawlEndsOn: string;
  currency: string;
  source: string;
  cash?: string;
  receivables?: string;
  tradeGoods?: string;
  zakatableInvestments?: string;
  shortTermLiabilities?: string;
  paidUpCapital?: string;
  reserves?: string;
  retainedEarnings?: string;
  netProfit?: string;
  fixedAssets?: string;
  longTermInvestments?: string;
  accumulatedLosses?: string;
}

export interface Zakat {
  method: ZakatMethod;
  methodStated: string;
  year: ZakatYear;
  rateStated: string;
  rateWhy: string;
  borneBy: BorneBy;
  borneByStated: string;
  hawlEndsOn: string;
  currency: string;
  source: string;
  base: string;
  due: string;
  baseIsNegative: boolean;
  steps: CalcStep[];
  note: string;
}

export interface DistributionInput {
  periodFrom: string;
  periodTo: string;
  currency: string;
  source: string;
  grossProfit: string;
  mudaribShareBps: number;
  perDeductionBps: number;
  perBalance: string;
  perCap: string;
  irrDeductionBps: number;
  irrBalance: string;
  irrCap: string;
  depositorFunds?: string;
}

export interface Smoothing {
  withoutSmoothing: string;
  paid: string;
  difference: string;
  direction: 'raised' | 'lowered' | 'none';
  rateWithoutSmoothingBps: number | null;
  ratePaidBps: number | null;
  note: string;
}

export interface Reserve {
  name: 'PER' | 'IRR';
  openingBalance: string;
  movement: string;
  closingBalance: string;
  cap: string;
  cappedAt: boolean;
  headroom: string;
}

export interface Distribution {
  periodFrom: string;
  periodTo: string;
  currency: string;
  source: string;
  method: string;
  grossProfit: string;
  distributableProfit: string;
  mudaribShare: string;
  depositorsShare: string;
  paidToDepositors: string;
  reserves: Reserve[];
  steps: CalcStep[];
  smoothing: Smoothing;
  note: string;
}

// ── a calculation, recorded against a period ──────────────────────────────

/**
 * The record that turns four calculators into evidence.
 *
 * Recording is **not** approving: a computation is a fact, and whether the
 * method was the right one is a ruling made in the ordinary way. The server
 * sends `whatRecordingMeans` with every response saying so, and it is shown
 * rather than restated here.
 */
export type CalculationKind =
  | 'screening'
  | 'purification'
  | 'zakat'
  | 'profit_distribution'
  | 'tangibility'
  | 'late_payment';

/**
 * How a signer proved who they were.
 *
 * Three stated values rather than a boolean, because the document prints them
 * in these words. A signature entered by the secretary at a sitting is a
 * weaker thing than one given behind a one-time code, and the page should read
 * that way to whoever relies on it.
 */
export type SigningProof =
  | 'their own sign-in'
  | 'their own sign-in and a one-time code'
  | 'in person at a sitting, entered by the secretary';

export interface Signing {
  scholarId: string;
  name: string;
  title: string;
  at: string;
  provedBy: SigningProof;
  /** The hash of the document this member actually signed. */
  documentHash: string;
  note?: string;
}

export interface DocumentSeal {
  version: number;
  documentHash: string;
  /** The installation that attests. Shown, so a reader knows who. */
  issuer: string;
  at: string;
  value: string;
}

/**
 * The written decision, as much of it as a screen needs.
 *
 * Deliberately not the whole document: the printable page is the document, and
 * a second rendering of the same prose in the application would be a second
 * thing to keep in step. What is here is what a member needs in order to
 * decide whether to sign.
 */
export interface SignedDocument {
  kind: string;
  reference: string;
  title: string;
  documentHash: string;
  /** Null where this installation holds no sealing key. */
  seal: DocumentSeal | null;
  signings: Signing[];
  quorumRequired: number;
  quorumRecorded: number;
}

/**
 * The pack: one matter, everything needed to decide it, in reading order.
 *
 * Assembled on the server from material that already existed on five separate
 * screens. Nothing in it is composed, so nothing here needs interpreting on
 * the way to the page — every field is either somebody's words or a figure a
 * service already produced.
 */
export interface Pack {
  matterId: string;
  boardId: string;
  title: string;
  status: string;
  direction: 'permit' | 'restrict';

  question: {
    text: string;
    notDecided: string[];
    mechanism: string;
    openedAt: string;
    arrivedAt: string | null;
    /** Null once the matter is settled: a decided question is not waiting. */
    waitedDays: number | null;
    /** True where the wait is measured only from what this system can see. */
    waitPartlyUnknown: boolean;
  };

  alreadySaid: { related: Related[]; nothingYet: boolean };
  figures: { computations: Computation[]; terms: RuleParameter[] };
  said: Deliberation[];
  follows: { carrying: Carrying; assetIds: string[]; structureId: string | null };
  evidence: SourceRef[];

  /** What Majlis could not tell you. Never empty by omission. */
  gaps: string[];

  standing: {
    required: number;
    recorded: Reasoning[];
    yetToSpeak: { scholarId: string; name: string }[];
  };

  assembledAt: string;
}

/**
 * The board book: everything for one sitting, in one document.
 *
 * The agenda in order, a pack under every item that is a matter, who is
 * expected, and the standing business the board carries whether or not
 * anybody put it on the agenda.
 */
/**
 * What somebody undertook to do at a sitting, and what became of it.
 *
 * Not a task list. It was minuted, it names a person who was in the room, and
 * it is closed by an account of what happened rather than by a tick.
 */
export interface Undertaking {
  id: string;
  boardId: string;
  meetingId: string;
  matterId?: string;
  what: string;
  who: string;
  /** Absent is a real answer: nothing is due unless the board said so. */
  dueAt?: string;
  minutedBy: string;
  minutedAt: string;
  state: 'open' | 'done' | 'dropped';
  outcome?: { said: string; by: string; at: string };
}

export interface BoardBook {
  meetingId: string;
  boardId: string;
  at: string;
  state: string;
  joinUrl: string | null;
  items: {
    number: number;
    item: string;
    matterId: string | null;
    /** Null where the item is not a matter, or names one that is not here. */
    pack: Pack | null;
    missing: boolean;
  }[];
  /** present is null before anybody recorded it. Never false by default. */
  expected: { scholarId: string; name: string; present: boolean | null; note?: string }[];
  unaccountedFor: string[];
  sinceWeMet: { kind: string; what: string; ref: string; note: string }[];
  /** What was undertaken here, and what is still open from before. */
  undertakings: {
    fromThisSitting: Undertaking[];
    stillOpenFromBefore: Undertaking[];
  };
  gaps: string[];
  assembledAt: string;
}

/**
 * A contract read against the conditions the board holds.
 *
 * There is no verdict and there is deliberately no "met": met is a finding,
 * it carries a scholar's name and a reason, and a person records it. What
 * comes back is where each condition is answered and where it is not.
 */
export interface ContractReading {
  structureId: string;
  structureName: string;
  /** Whether the board adopted this shape, or it is the shipped draft. */
  adopted: boolean;
  conditions: {
    conditionId: string;
    requirement: string;
    standing: 'found' | 'unclear' | 'absent';
    /** The sentences it was found in, and where each starts. */
    passages: { text: string; at: number }[];
    note: string;
    /** True where no reading of words could settle it, whatever was found. */
    needsAPerson: boolean;
  }[];
  charactersRead: number;
  /** Never empty. A reading with nothing it could not do would be a lie. */
  limits: string[];
  readAt: string;
}

export interface Computation {
  id: string;
  kind: CalculationKind;
  boardId: string;
  assetId: string | null;
  periodFrom: string;
  periodTo: string;
  method: string;
  methodStated: string;
  currency: string;
  source: string;
  figures: Record<string, string | number | boolean | null>;
  headline: string;
  amount: string;
  steps: CalcStep[];
  note: string;
  recordedBy: string;
  recordedAt: string;
  supersedes: string | null;
  withdrawnAt: string | null;
  withdrawnBy: string | null;
  withdrawalReason: string | null;
}

export interface HistoryEntry {
  computation: Computation;
  state: 'standing' | 'superseded' | 'withdrawn';
  replacedBy: string | null;
}

export interface ComputationList {
  history: HistoryEntry[];
  /** The ids a reader should act on. Derived on the server, never stored. */
  standing: string[];
  whatRecordingMeans: string;
}

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
  steps: CalcStep[];
  note: string;
  supersedes?: string | null;
}

// ── the manual ────────────────────────────────────────────────────────────

export interface ManualEntry {
  ruleId: string;
  title: string;
  statement: string;
  inForceFrom: string | null;
  terms: RuleParameter[];
  implementationSteps: string[];
  notDecided: string[];
  decidedIn: string | null;
  review: ReviewStatus;
  gaps: string[];
}

export interface Manual {
  generatedAt: string;
  entries: ManualEntry[];
  superseded: ManualEntry[];
  incomplete: number;
  unscheduled: number;
}

/**
 * Everything Block One added, and the documents it produces.
 *
 * The documents are deliberately not fetched as JSON and rendered here. They
 * are whole pages designed for print, and a browser opening one directly is
 * both simpler and the thing a scholar actually wants — a tab they can save as
 * a PDF. `hrefs` gives the address; nothing fetches it.
 */
export const oversight = {
  pace: () => get<PaceResponse>('/api/pace'),
  reviews: () => get<ReviewsResponse>('/api/reviews'),
  calendar: () => get<Calendar>('/api/calendar'),
  settings: () => get<Settings>('/api/settings'),

  register: () => get<Register>('/api/register'),
  drift: () => get<DriftReport>('/api/drift'),

  structures: () => get<{ structures: Structure[]; note: string }>('/api/structures'),

  /**
   * The library as this board holds it, and taking a shape as its own.
   *
   * `structures` above is the shipped draft; this is what the board has done
   * about it. Both are needed: the picker offers shapes, and this says which of
   * them the board has actually taken.
   */
  library: () => get<Library>('/api/adoptions'),

  /**
   * Meetings, and what they owe the calendar.
   *
   * The cadence comes back with the list rather than behind a second request:
   * "when did we last meet" and "when are we next due" are one question a
   * chair asks in one glance.
   */
  /** Every document this board has been given, across all its matters. */
  documents: () => get<{ documents: BoardDocument[] }>('/api/documents'),

  /**
   * Read figures out of one.
   *
   * Returns candidates and writes nothing. The fields are named by the caller:
   * a model that chose which figures the board wanted would be choosing what
   * the board was asking.
   */
  readDocument: (matterId: string, sourceId: string, fields: string[]) =>
    send<Extraction>(`/api/matters/${matterId}/sources/${sourceId}/extract`, { fields }),

  meetings: () => get<Meetings>('/api/meetings'),
  meeting: (id: string) => get<MeetingRow>(`/api/meetings/${id}`),
  convene: (input: { boardId: string; at: string; joinUrl?: string | null; agenda: AgendaItem[] }) =>
    send<Meeting>('/api/meetings', input),
  recordAttendance: (id: string, attendance: Attendance[]) =>
    send<Meeting>(`/api/meetings/${id}/attendance`, { attendance }, 'PUT'),
  writeMinute: (id: string, minute: string) =>
    send<Meeting>(`/api/meetings/${id}/minute`, { minute }, 'PUT'),
  closeMeeting: (id: string) => send<Meeting>(`/api/meetings/${id}/close`),
  adoptionHistory: (structureId: string) =>
    get<{ history: { adoption: AdoptedStructure; replacedBy: string | null }[] }>(
      `/api/adoptions/${structureId}/history`,
    ),
  adopt: (input: AdoptInput) =>
    send<{ adoption: AdoptedStructure; note: string }>('/api/adoptions', input),
  checklist: (id: string) => get<Checklist>(`/api/matters/${id}/checklist`),
  setStructure: (id: string, structureId: string | null) =>
    send<Matter>(`/api/matters/${id}/structure`, { structureId }, 'PUT'),
  recordFinding: (
    id: string,
    finding: { conditionId: string; holds: ConditionFinding['holds']; reason: string },
  ) => send<Matter>(`/api/matters/${id}/findings`, finding),
  asset: (id: string) => get<AssetDetail>(`/api/assets/${id}`),
  addAsset: (input: { kind: AssetKind; name: string; identifiers: AssetIdentifier[] }) =>
    send<Asset>('/api/assets', input),
  retireAsset: (id: string, reason: string) =>
    send<Asset>(`/api/assets/${id}/retire`, { reason }),

  incidents: () => get<IncidentList>('/api/incidents'),
  incident: (id: string) => get<Incident>(`/api/incidents/${id}`),

  report: (input: { boardId: string; reference: string; title: string; report: string }) =>
    send<Incident>('/api/incidents', input),
  concur: (id: string, actual: boolean, reason: string) =>
    send<Incident>(`/api/incidents/${id}/concurrence`, { actual, reason }),
  stop: (id: string, activities: string[]) =>
    send<Incident>(`/api/incidents/${id}/stopped`, { activities }),
  filePlan: (id: string, steps: string[], completeBy: string) =>
    send<Incident>(`/api/incidents/${id}/plan`, { steps, completeBy }),
  endorsePlan: (id: string) => send<Incident>(`/api/incidents/${id}/plan/endorse`),
  returnPlan: (id: string, reason: string) =>
    send<Incident>(`/api/incidents/${id}/plan/return`, { reason }),
  directors: (id: string) => send<Incident>(`/api/incidents/${id}/directors`),
  submission: (id: string) => send<Incident>(`/api/incidents/${id}/submission`),
  prescribe: (id: string, p: { amount: string; currency: string; destination: string }) =>
    send<Incident>(`/api/incidents/${id}/purification`, p),
  purificationPaid: (id: string, reference: string) =>
    send<Incident>(`/api/incidents/${id}/purification/paid`, { reference }),
  closeIncident: (id: string) => send<Incident>(`/api/incidents/${id}/close`),

  manual: () => get<Manual>('/api/manual?format=json'),

  /**
   * Where a matter stands, and what the next act is.
   *
   * Derived on read. It reports what is in the record and what is not, and
   * never that the question is well enough put to be decided — that is the
   * board's judgement.
   */
  passage: (matterId: string) => get<Passage>(`/api/matters/${matterId}/passage`),

  /**
   * What these terms will do once the board has ruled, and when they are tested.
   *
   * Assembled from the matter and the enforcement adapter. Nothing here is
   * generated, so it is available in the installations that have no assistant —
   * which is most of them.
   */
  carrying: (matterId: string) => get<Carrying>(`/api/matters/${matterId}/carrying`),

  /**
   * What this board already decided about a question of this shape.
   *
   * Proposals, never findings. Accepting one is a separate act recorded under
   * the scholar's own name at today's date.
   */
  inheritance: (matterId: string) => get<Inheritance>(`/api/matters/${matterId}/inheritance`),

  screen: (figures: Figures, previous?: Assessment) =>
    send<{ assessment: Assessment; crossings: Crossing[] }>('/api/screening', { figures, previous }),

  /**
   * The three that had no screen until now.
   *
   * Each is stateless on the server: figures go in, arithmetic comes back, and
   * nothing is stored. So nothing here caches a result either — a figure held
   * from a previous period and shown as current would be worse than no figure.
   */
  purify: (input: PurificationInput) => send<Purified>('/api/purification', input),
  zakat: (input: ZakatInput) => send<Zakat>('/api/zakat', input),
  distribute: (input: DistributionInput) => send<Distribution>('/api/distribution', input),

  /**
   * Where a composition falls, and what this board said about that band.
   *
   * The proportion is arithmetic; the consequence is the board's own sentence,
   * carried back verbatim. A composition landing outside every band comes back
   * with `band: null` and the gap named in `unstated` — a 200, because the
   * arithmetic succeeded and it is the rule that has the hole.
   */
  tradability: (input: TradabilityInput) => send<Tradability>('/api/tradability', input),

  /**
   * An increase taken on a late debt, and where the board directed it.
   *
   * Comes back as an amount and a destination. What is not retained against
   * evidenced collection cost is to be given away — there is no response field
   * that would let an unevidenced amount stay with the institution.
   */
  latePayment: (input: LatePaymentInput) => send<LatePayment>('/api/late-payment', input),

  /**
   * Recording one, and reading what has been recorded.
   *
   * The history includes the superseded and the withdrawn. A board that
   * revised a figure twice should be able to see that it did, and a list
   * showing only the survivor hides the revision.
   */
  computations: (q: { kind?: string; assetId?: string } = {}) => {
    const search = new URLSearchParams(
      Object.entries(q).filter(([, v]) => v !== undefined) as [string, string][],
    ).toString();
    return get<ComputationList>('/api/computations' + (search ? '?' + search : ''));
  },
  recordComputation: (input: RecordInput) =>
    send<{ computation: Computation; whatRecordingMeans: string }>('/api/computations', input),
  withdrawComputation: (id: string, reason: string) =>
    send<{ computation: Computation }>(`/api/computations/${id}/withdraw`, { reason }),

  setImplementation: (id: string, steps: string[]) =>
    send<Matter>(`/api/matters/${id}/implementation`, { steps }),

  /**
   * The written decision as a structure, so the screen can show who has signed
   * it without opening the printable page.
   *
   * The same route the document is rendered from. Asking for JSON rather than
   * keeping a second endpoint means the two can never disagree about what the
   * document says.
   */
  document: (id: string) => get<SignedDocument>(`/api/matters/${id}/fatwa?format=json`),

  /**
   * Sign the written decision.
   *
   * The hash is not sent. The server computes it from the record at the moment
   * of signing, so what a member signs is the document as it stands and not
   * whatever a client chose to put in the request.
   */
  sign: (id: string, provedBy: SigningProof, note?: string) =>
    send<Signing>(`/api/matters/${id}/sign`, { provedBy, ...(note ? { note } : {}) }),

  /**
   * Read a contract against the conditions this board holds.
   *
   * Pasted rather than uploaded. The upload path needs a configured volume,
   * which most installations do not have and the demonstration record has no
   * document in — so the reading existed and nobody could reach it. Nothing
   * about the text is kept.
   */
  /**
   * The words for telling the bank something happened.
   *
   * Composed on the server so that one event has one wording wherever it is
   * shown. Never sent: the delivery comes back saying so.
   */
  /** What was undertaken at a sitting, and what became of it. */
  undertakings: (boardId?: string) =>
    get<{
      boardId: string;
      undertakings: { undertaking: Undertaking; whoName: string; overdue: boolean }[];
      summary: { open: number; overdue: number; openWithNoDate: number; done: number; dropped: number };
    }>('/api/undertakings' + (boardId ? `?board=${encodeURIComponent(boardId)}` : '')),

  /** Close one by saying what happened. A tick would record nothing useful. */
  closeUndertaking: (id: string, state: string, said: string) =>
    send<{ undertaking: Undertaking }>(`/api/undertakings/${id}/close`, { state, said }),

  /** Every note on one thing being read, with each passage found in the text as it stands. */
  margin: (on: string, subjectId: string) =>
    get<Margin>(`/api/annotations/${on}/${encodeURIComponent(subjectId)}`),

  /** Write one. `quote` is omitted on a reply, which inherits the passage. */
  annotate: (input: { on: string; subjectId: string; quote?: string; said: string; replyTo?: string }) =>
    send<{ annotation: Annotation }>('/api/annotations', input),

  /** Withdraw one. It stays, marked, with what it said. */
  withdrawNote: (id: string) =>
    send<{ annotation: Annotation }>(`/api/annotations/${id}/withdraw`),

  /** What was referred on one matter, and what came back. */
  referrals: (matterId: string) =>
    get<{ matterId: string; referrals: ReferralOnMatter[]; note: string }>(
      `/api/matters/${encodeURIComponent(matterId)}/referrals`,
    ),

  /** Every committee this board keeps, with what each is carrying. */
  committees: (boardId?: string) =>
    get<{
      boardId: string;
      committees: {
        committee: Committee;
        memberNames: string[];
        convenorName: string | null;
        summary: { waiting: number; reported: number; withdrawn: number; notUnanimous: number };
      }[];
      keepsNone: boolean;
    }>('/api/committees' + (boardId ? `?board=${encodeURIComponent(boardId)}` : '')),

  /** Ask a committee to look at a matter first. It decides nothing. */
  referMatter: (input: { committeeId: string; matterId: string; asking: string }) =>
    send<{ referral: Referral }>('/api/referrals', input),

  /** The committee's account of what it found. Dissent carries words. */
  reportOnReferral: (
    id: string,
    found: string,
    standing: { scholarId: string; agrees: boolean; said?: string }[],
  ) => send<{ referral: Referral; stood: HowItStood | null }>(`/api/referrals/${id}/report`, { found, standing }),

  telling: (kind: string, id: string) =>
    get<{ notice: Notice; delivery: Delivery }>(`/api/telling/${kind}/${id}`),

  readContract: (matterId: string, text: string) =>
    send<ContractReading>(`/api/matters/${matterId}/reading`, { text }),

  /**
   * The same reading with the shape named, and no matter involved.
   *
   * What a scholar does before anything is opened: here is the draft, here are
   * the conditions this kind of arrangement is judged against, show me where
   * it answers each of them.
   */
  /** Which of the shapes does this draft look like? It suggests; nobody decides. */
  recognise: (text: string) => send<Recognition>('/api/recognise', { text }),

  readAgainstShape: (structureId: string, text: string) =>
    send<ContractReading>('/api/reading', { structureId, text }),

  /** Addresses of the printable documents. Opened, never fetched. */
  hrefs: {
    fatwa: (id: string) => `/api/matters/${id}/fatwa`,
    /**
     * Draft clauses, assembled from the ruling.
     *
     * Only offered where the board has decided and judged the matter against a
     * shape: the route refuses otherwise, and a link that leads to a refusal is
     * a link that lied.
     */
    contract: (id: string) => `/api/matters/${id}/contract`,
    manual: () => '/api/manual',
    annual: (year: number) => `/api/annual?year=${year}`,
    /** Everything the board ever decided about one holding, as a page. */
    holding: (assetId: string) => `/api/assets/${assetId}/document`,
    calendarFeed: () => '/api/calendar.ics',
  },
};

// ── the calendar ──────────────────────────────────────────────────────────

export type EntryKind =
  | 'timelock_ends'
  | 'ratification_due'
  | 'rectification_due'
  | 'review_due'
  /** The sixth clock, and the last to get anything to count from. */
  | 'meeting_due';

export interface CalendarEntry {
  id: string;
  kind: EntryKind;
  at: string;
  title: string;
  subject: string;
  note: string;
  overdue: boolean;
  waitingOn: string[];
}

export interface Calendar {
  asOf: string;
  boardId: string | null;
  entries: CalendarEntry[];
  /** What the record cannot put on a calendar. Shown, not footnoted. */
  gaps: string[];
}

// ── the board's own configuration ─────────────────────────────────────────

export interface SeatedMember {
  scholarId: string;
  name: string;
  title: string;
  /** What the board record says. */
  signatory: boolean;
  /** What the credential file says. Null where they hold none. */
  role: Role | null;
  office: 'chair' | 'secretary' | null;
}

export interface Mismatch {
  kind: 'no_credential' | 'not_on_board' | 'vote_discarded' | 'cannot_vote';
  scholarId: string;
  /** What goes wrong, in terms of what it costs. */
  consequence: string;
}

export interface Settings {
  boardId: string;
  boardName: string;
  institutionId: string;
  /** Whether any credential is configured. Not the same as whether they agree. */
  credentialsConfigured: boolean;
  members: SeatedMember[];
  decides: {
    quorumPermit: number;
    quorumRestrict: number;
    totalSignatories: number;
    signatoriesSeated: number;
    ratificationWindowHours: number;
    timelockHours: number;
  };
  /** Where the board record and the credential file disagree. Empty is the goal. */
  mismatches: Mismatch[];
  fixIn: string;
}

// ── the register ──────────────────────────────────────────────────────────

export type AssetKind = 'token' | 'pool' | 'security' | 'instrument' | 'product';

export type AssetStatus =
  | 'never_examined'
  | 'under_consideration'
  | 'permitted'
  | 'restricted'
  | 'lapsed'
  | 'retired';

export interface AssetIdentifier {
  scheme: 'chain' | 'isin' | 'ticker' | 'internal';
  value: string;
  network?: string;
}

/** What a holding is made of, as the register already holds it. */
export interface Composition {
  asOf: string;
  source: string;
  parts: CompositionPart[];
}

export interface Asset {
  id: string;
  institutionId: string;
  kind: AssetKind;
  name: string;
  identifiers: AssetIdentifier[];
  source: 'registry' | 'institution' | 'member';
  addedAt: string;
  addedBy: string | null;
  /**
   * The server has always sent this and the client type did not declare it,
   * so every screen was blind to figures that were arriving in the response.
   * `TradabilityInput` wants exactly `{ asOf, source, parts }` and the register
   * holds exactly `{ asOf, source, parts }` — and a scholar was asked to retype
   * all of it because a type said the field was not there.
   */
  composition: Composition | null;
  retiredAt: string | null;
  retiredReason: string | null;
}

export interface AssetStanding {
  asset: Asset;
  status: AssetStatus;
  /** The ruling that decides the status, where one does. */
  governedBy: string | null;
  openMatters: string[];
  history: string[];
  note: string;
}

/** A composition read out with its arithmetic. Never a conclusion. */
export interface CompositionReading {
  asOf: string;
  source: string;
  parts: { label: string; kind: string; bps: number; percent: string }[];
  byKind: { kind: string; bps: number; percent: string }[];
  incomplete: boolean;
  total: number;
  note: string;
}

export interface AssetDetail extends AssetStanding {
  composition: CompositionReading | null;
}

export interface Register {
  asOf: string;
  institutionId: string | null;
  assets: AssetStanding[];
  counts: Record<AssetStatus, number>;
  /** How much of the universe has never been looked at. */
  neverExamined: number;
  total: number;
}

// ── the contract shapes ───────────────────────────────────────────────────

export interface StructureCondition {
  id: string;
  requirement: string;
  /** What goes wrong when it is not met. The part a scholar can argue with. */
  why: string;
  evidence: 'document' | 'sequence' | 'figure' | 'undertaking';
}

export interface Structure {
  id: string;
  name: string;
  family: string;
  conditions: StructureCondition[];
  calculations: string[];
}

export interface ConditionFinding {
  conditionId: string;
  holds: 'met' | 'not_met' | 'not_applicable';
  reason: string;
  scholarId: string;
  at: string;
  supersededAt?: string | null;
}

export interface ConditionState {
  condition: StructureCondition;
  /** This member's standing finding, where they have one. */
  finding: ConditionFinding | null;
  /** Every finding on it, newest first, superseded ones included. */
  history: ConditionFinding[];
  answeredBy: string[];
}

export interface Checklist {
  structure: Structure;
  /**
   * Whether these conditions are the board's own or the shipped draft.
   *
   * The difference matters enough to be on the screen: a checklist built
   * against the draft is a board judging a matter beside somebody else's
   * reading, and one built against an adopted shape is a board judging it
   * against its own.
   */
  source: 'adopted' | 'amended' | 'draft';
  /** True where the board considered this shape and ruled against using it. */
  declined: boolean;
  sourceNote: string;
  /** What the board said these rest on. Null where it said nothing. */
  basis: string | null;
  conditions: ConditionState[];
  unanswered: string[];
  /** Conditions where standing findings disagree. Not a fault — a discussion. */
  contested: string[];
  answered: number;
  total: number;
  note: string;
}

// ── the library as this board holds it ────────────────────────────────────

export interface AdoptedStructure {
  id: string;
  boardId: string;
  structureId: string;
  standing: 'adopted' | 'amended' | 'declined';
  conditions: StructureCondition[];
  /** What the board changed and why, or why it declined. */
  amendments: string[];
  /**
   * What this board says its conditions rest on, in its own words.
   *
   * Absent where the board did not say. The shipped library names no standard,
   * so there is nothing to fall back to — which standard governs is each
   * board's decision and no two need decide alike.
   */
  basis?: string;
  /** The settled matter it was decided in. Checked on the server. */
  matterId: string;
  decidedBy: string;
  decidedAt: string;
  supersedes: string | null;
}

export interface HeldStructure {
  structure: Structure;
  source: 'adopted' | 'amended' | 'draft';
  adoption: AdoptedStructure | null;
  declined: boolean;
  note: string;
  /**
   * The matters that name this shape, and whether a draft exists for each.
   *
   * A draft is assembled from a ruling, which is right — a contract drafted
   * from nothing is an agreement the board never made. But it left this
   * screen with no way forward: nineteen descriptions and nothing to do. The
   * shape becomes a starting point once it can say what the board ruled with
   * it, or that nobody has.
   */
  usedBy?: { matterId: string; title: string; status: string; hasDraft: boolean }[];
}

export interface Library {
  boardId: string;
  library: HeldStructure[];
  adopted: number;
  declined: number;
  total: number;
  notes: { draft: string; adopted: string; declined: string };
}

export interface AdoptInput {
  structureId: string;
  boardId: string;
  standing: 'adopted' | 'amended' | 'declined';
  matterId: string;
  amendments?: string[];
  conditions?: StructureCondition[];
  supersedes?: string | null;
}

// ── reading figures out of a document ─────────────────────────────────────

export interface BoardDocument {
  matterId: string;
  matterTitle: string;
  sourceId: string;
  label: string;
  name: string;
  bytes: number;
  mediaType: string;
  addedBy: string | null;
  at: string | null;
  /** The citation was withdrawn. The document is still here. */
  withdrawn: boolean;
}

/**
 * A figure proposed out of a document, not a figure.
 *
 * Nothing here enters a calculation until a member confirms it against the
 * quote beside it. Extraction never sets `confirmedBy` — a model cannot
 * confirm on a scholar's behalf, and cannot be allowed to say that it did.
 */
export interface FigureCandidate {
  field: string;
  value: string | null;
  /** The sentence it came from, verbatim. */
  quote: string | null;
  locator: { page: number; label?: string } | null;
  /**
   * Whether the quote was matched against the document's own text.
   *
   * False for a PDF, where the file itself was sent and there was no text to
   * check against — so the quote is the model's account of the document rather
   * than an excerpt anybody verified.
   */
  quoteVerified: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
  /** Not in the document. Never a zero. */
  notFound: boolean;
}

export interface Extraction {
  documentName: string;
  fields: string[];
  candidates: FigureCandidate[];
  /** Thrown away before anyone saw them, and why. Shown, not hidden. */
  discarded: { field: string; reason: string }[];
  note: string;
}

// ── meetings ──────────────────────────────────────────────────────────────

/**
 * A meeting, as a record rather than a room.
 *
 * Majlis does not host the call. What it holds is the agenda, who was there
 * and the minute — and the agenda links each item to the matter where the
 * decision actually lives, because a meeting decides nothing.
 */
export interface AgendaItem {
  item: string;
  /** Set where the item is a matter already before the board. */
  matterId?: string;
}

export interface Attendance {
  scholarId: string;
  present: boolean;
  /** Frameworks that set an attendance floor expect absence to be explicable. */
  note?: string;
}

export interface Meeting {
  id: string;
  boardId: string;
  at: string;
  joinUrl: string | null;
  agenda: AgendaItem[];
  attendance: Attendance[];
  minute: string;
  recordedBy: string;
  closedAt: string | null;
}

/** Derived on the server from what is recorded, never stored on the meeting. */
export type MeetingState = 'convened' | 'held' | 'minuted' | 'closed';

export interface MeetingRow {
  meeting: Meeting;
  state: MeetingState;
  /** Members with no attendance entry. Reported rather than marked absent. */
  unaccountedFor: string[];
}

export interface AttendanceSummary {
  scholarId: string;
  name: string;
  attended: number;
  of: number;
  notes: string[];
}

export interface Cadence {
  lastHeldAt: string | null;
  dueBy: string | null;
  overdue: boolean;
  nextConvenedAt: string | null;
  note: string;
}

export interface Meetings {
  boardId: string;
  meetings: MeetingRow[];
  attendance: AttendanceSummary[];
  cadence: Cadence;
}

// ── drift ─────────────────────────────────────────────────────────────────

export interface Drift {
  assetId: string;
  assetName: string;
  /** The decision whose term is crossed, so a reader can go and read it. */
  matterId: string;
  term: { key: string; value: string; meaning: string; bound: 'minimum' | 'maximum' };
  observed: { kind: string; bps: number; percent: string };
  direction: 'into_breach' | 'back_within';
  asOf: string;
  source: string;
  /** Written by the server, so no interface can soften it into a conclusion. */
  questionForBoard: string;
}

export interface Unwatched {
  assetId: string;
  matterId: string;
  key: string;
  reason: string;
}

export interface DriftReport {
  asOf: string;
  drifting: Drift[];
  /** Terms that could be checked and are not, which is its own finding. */
  unwatched: Unwatched[];
  unmeasured: { assetId: string; assetName: string; reason: string }[];
}

// ── the way in ────────────────────────────────────────────────────────────

export type SubmissionStanding = 'waiting' | 'opened' | 'declined' | 'withdrawn';

export interface Disposition {
  kind: 'opened' | 'declined' | 'withdrawn';
  at: string;
  by: string;
  reason?: string;
  matterId?: string;
}

/**
 * A question the institution put, as the server reports it.
 *
 * `standing`, `matterId` and `waitedHours` are derived on the server and sent
 * with it, so no two screens can derive them differently — which is how a queue
 * and a detail page start disagreeing about whether something is still waiting.
 */
/** A contract sent with a question, as words read out of a file at the desk. */
export interface SubmittedDraft {
  name: string;
  text: string;
  readAt: string;
}

/** One shape the draft might be, with the working that put it there. */
export interface ShapeGuess {
  structureId: string;
  name: string;
  found: number;
  partly: number;
  of: number;
  matched: string[];
  /** The shape's own name, in the draft's own words, where it appears. */
  namedInTheDraft: string | null;
}

export interface Recognition {
  readAt: string;
  guesses: ShapeGuess[];
  /** Said on the screen, never in a footnote: this counts words, it does not read. */
  note: string;
}

export interface Submission {
  id: string;
  boardId: string;
  institutionId: string;
  arrivedAt: string;
  recordedAt: string;
  askedBy: string;
  recordedBy: string;
  onBehalf: boolean;
  subject: string;
  /** The institution's own words. Never edited, and never shown paraphrased. */
  question: string;
  background: string;
  awaiting: string;
  /** Vault ids, where the installation has a volume to keep files on. */
  attachments: string[];
  /**
   * The contract the question is about, where the institution sent one.
   *
   * The words rather than the file: a vault needs a mounted volume and most
   * installations have none, so a question about a contract used to arrive
   * with the contract missing.
   */
  draft: SubmittedDraft | null;
  dispositions: Disposition[];

  standing: SubmissionStanding;
  matterId: string | null;
  waitedHours: number;
}

/** The words to tell a member something arrived. */
export interface Notice {
  subject: string;
  body: string;
  concerns: string[];
}

/**
 * Whether anything was actually sent.
 *
 * `sent` is false on every installation with no channel, which is most of them,
 * and the interface has to say that in words rather than showing the notice
 * silently — a secretary who assumed the board had been emailed would find out
 * only when nobody turned up.
 */
export interface Delivery {
  kind: 'none' | 'smtp';
  configured: boolean;
  sent: boolean;
  at: string;
  reached?: number;
  error?: string;
}

export interface PutQuestion {
  boardId: string;
  subject: string;
  question: string;
  background?: string;
  awaiting?: string;
  /** Who asked, at the institution. Required when a member enters it for them. */
  askedBy?: string;
  /** When they actually asked, where that is not now. */
  arrivedAt?: string;
  attachments?: string[];
  /** The contract this question is about, read out of a file at the desk. */
  draft?: { name: string; text: string } | null;
}

export const theWayIn = {
  /** Put a question to the board. */
  put: (input: PutQuestion) =>
    send<{ submission: Submission; notice: Notice; delivery: Delivery }>('/api/submissions', input),

  /**
   * The board sees the whole queue; a desk sees only what it put itself.
   * Which of the two happens is decided by the credential, on the server.
   */
  list: (boardId?: string) =>
    get<{ submissions: Submission[]; waiting: string[] }>(
      '/api/submissions' + (boardId ? `?board=${encodeURIComponent(boardId)}` : ''),
    ),

  one: (id: string) => get<{ submission: Submission }>(`/api/submissions/${id}`),

  /** The board takes it up. The title and proposal are the board's own wording. */
  open: (
    id: string,
    input: {
      title: string;
      proposal: string;
      direction: 'permit' | 'restrict';
      notDecided?: string[];
    },
  ) =>
    send<{ submission: Submission; matter: Matter; notice: Notice; delivery: Delivery }>(
      `/api/submissions/${id}/open`,
      input,
    ),

  decline: (id: string, reason: string) =>
    send<{ submission: Submission }>(`/api/submissions/${id}/decline`, { reason }),

  /** Whoever asked takes it back. The board declines instead, and says why. */
  withdraw: (id: string, reason: string) =>
    send<{ submission: Submission }>(`/api/submissions/${id}/withdraw`, { reason }),
};

// ── examining what was executed against what was approved ─────────────────

/**
 * What a person records against one condition or one operative term.
 *
 * The same fields as a stored finding minus `inWords`, which the server
 * derives from the rule when it reads one back. A client sending it would be
 * sending the board's own sentence back to the board.
 */
export type RecordedFinding = Omit<ExaminationFinding, 'inWords'>;

export interface ExaminationFinding {
  /** A condition id of the shape, or `term:<key>` for an operative term. */
  against: string;
  /**
   * What that identifier is, in the board's own sentence.
   *
   * Resolved on the server from the rule this examination is against, so the
   * screen, the annual report and the audit export all read the same words
   * rather than each rendering an identifier. Null where the term or condition
   * has since been removed from the rule — the finding is still evidence about
   * what was examined, and inventing a sentence for it would be worse.
   */
  inWords: string | null;
  held: 'held' | 'exceptions' | 'not_examined';
  exceptions: number;
  note: string;
}

export interface Coverage {
  examined: number;
  /** Null where the institution did not say how many transactions there were. */
  population: number | null;
  /** Null for the same reason. Never inferred from the sample. */
  percent: string | null;
}

export interface Examination {
  id: string;
  boardId: string;
  matterId: string;
  ruleId: string;
  parameterHash: string;
  from: string;
  to: string;
  /** How the sample was chosen, in the examiner's words. Never generated. */
  howChosen: string;
  population: number | null;
  examined: number;
  examinedBy: string;
  recordedAt: string;
  findings: ExaminationFinding[];

  /** Derived on the server, so two screens cannot derive them differently. */
  coverage: Coverage;
  exceptions: number;
  /** Conditions and terms this examination did not reach. Named, not omitted. */
  notExamined: string[];
  matterTitle: string | null;
  /**
   * False where the board has amended the terms since. The examination is then
   * evidence about the older ones, and the screen has to say so.
   */
  againstCurrentTerms: boolean | null;
}

/** What a ruling can be examined against. */
export interface Examinable {
  matterId: string;
  title: string;
  settled: boolean;
  conditions: { against: string; requirement: string }[];
  terms: { against: string; requirement: string; key: string }[];
}

export const examinations = {
  list: (boardId?: string, matterId?: string) => {
    const p = new URLSearchParams();
    if (boardId) p.set('board', boardId);
    if (matterId) p.set('matter', matterId);
    const q = p.toString();
    return get<{ examinations: Examination[]; count: number }>(
      '/api/examinations' + (q ? '?' + q : ''),
    );
  },

  one: (id: string) => get<{ examination: Examination }>(`/api/examinations/${id}`),

  /** The conditions and terms of one ruling, so a form does not assemble them. */
  examinable: (matterId: string) => get<Examinable>(`/api/matters/${matterId}/examinable`),

  record: (input: {
    matterId: string;
    from: string;
    to: string;
    howChosen: string;
    population: number | null;
    examined: number;
    findings: RecordedFinding[];
  }) => send<{ examination: Examination }>('/api/examinations', input),
};
