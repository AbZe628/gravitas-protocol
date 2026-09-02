
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

export interface Deliberation {
  id: string;
  scholarId: string;
  body: string;
  at: string;
  replyTo: string | null;
  liaisonAnswer: boolean;
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
}

export const api = {
  health: () => get<Health>('/api/health'),
  boards: () => get<Board[]>('/api/boards'),
  board: (id: string) => get<Board>(`/api/boards/${id}`),
  matters: () => get<MatterSummary[]>('/api/matters'),
  matter: (id: string) => get<Matter>(`/api/matters/${id}`),
  rules: () => get<Rule[]>('/api/rules'),
  briefings: () => get<Briefing[]>('/api/briefings'),
  registry: () => get<RegistrySnapshot>('/api/registry'),
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
  | 'overdue';

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

  /** Withdraw one you attached. Withdrawn, not deleted. */
  withdrawSource: (id: string, sourceId: string) =>
    send<Matter>(`/api/matters/${id}/sources/${sourceId}`, undefined, 'DELETE'),

  /** Set the operative terms. Refused once a vote is open. */
  setParameters: (id: string, parameters: RuleParameter[]) =>
    send<Matter>(`/api/matters/${id}/parameters`, { parameters }, 'PUT'),

  object: (id: string, reason: string) => send<Matter>(`/api/matters/${id}/object`, { reason }),
  bringIntoForce: (id: string) => send<Matter>(`/api/matters/${id}/force`),
  withdraw: (id: string) => send<Matter>(`/api/matters/${id}/withdraw`),
};
