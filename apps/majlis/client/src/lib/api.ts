
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

export const api = {
  health: () => get<Health>('/api/health'),
  boards: () => get<Board[]>('/api/boards'),
  board: (id: string) => get<Board>(`/api/boards/${id}`),
  matters: () => get<MatterSummary[]>('/api/matters'),
  matter: (id: string) => get<Matter>(`/api/matters/${id}`),
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

export type Role = 'signatory' | 'advisory' | 'liaison' | 'observer';

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
  authority: string;
}

export interface Assessment {
  asOf: string;
  source: string;
  currency: string;
  ratios: RatioResult[];
  allWithinThresholds: boolean | null;
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

  /** Addresses of the printable documents. Opened, never fetched. */
  hrefs: {
    fatwa: (id: string) => `/api/matters/${id}/fatwa`,
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

export interface Asset {
  id: string;
  institutionId: string;
  kind: AssetKind;
  name: string;
  identifiers: AssetIdentifier[];
  source: 'registry' | 'institution' | 'member';
  addedAt: string;
  addedBy: string | null;
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
  authority: string;
}

export interface Structure {
  id: string;
  name: string;
  family: string;
  conditions: StructureCondition[];
  calculations: string[];
  authority: string;
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
