export interface SourceRef {
  kind: 'code' | 'test' | 'document' | 'chain' | 'external';
  label: string;
  ref: string;
}

export interface RuleParameter {
  key: string;
  value: string;
  unit?: string;
  meaning: string;
}

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

export interface Reasoning {
  scholarId: string;
  position: 'for' | 'against' | 'abstain';
  reason: string;
  at: string;
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

export const api = {
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
