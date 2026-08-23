/**
 * The in-memory store.
 *
 * This is what the tests run against and what `npm run dev` uses when no
 * database file is configured. It is also the reference: the SQLite store is
 * held to the same contract suite, so a disagreement between them is a failing
 * test rather than a surprise in production.
 *
 * Everything is deep-copied on the way in and on the way out. A store that
 * hands out references to its own state lets a caller mutate the record by
 * accident, and the bug that produces surfaces far away from the cause.
 */

import type { AssistantExchange, Board, Briefing, Matter, Rule } from '../types.js';
import { boards as seedBoards, briefings as seedBriefings, matters as seedMatters, rules as seedRules } from '../data/seed.js';
import { ASSISTANT_LOG_MAX, NotFound, type Store } from './store.js';

const copy = <T>(value: T): T => structuredClone(value);

export interface MemorySeed {
  boards?: Board[];
  rules?: Rule[];
  matters?: Matter[];
  briefings?: Briefing[];
}

export class MemoryStore implements Store {
  private readonly _boards: Board[];
  private readonly _rules: Rule[];
  private readonly _matters: Map<string, Matter>;
  private readonly _briefings: Briefing[];
  private readonly _log: AssistantExchange[] = [];

  constructor(seed: MemorySeed = {}) {
    this._boards = copy(seed.boards ?? seedBoards);
    this._rules = copy(seed.rules ?? seedRules);
    this._briefings = copy(seed.briefings ?? seedBriefings);
    this._matters = new Map((seed.matters ?? seedMatters).map((m) => [m.id, copy(m)]));
  }

  async boards(): Promise<Board[]> {
    return copy(this._boards);
  }

  async board(id: string): Promise<Board | null> {
    return copy(this._boards.find((b) => b.id === id) ?? null);
  }

  async rules(boardId?: string): Promise<Rule[]> {
    return copy(boardId ? this._rules.filter((r) => r.boardId === boardId) : this._rules);
  }

  async rule(id: string): Promise<Rule | null> {
    return copy(this._rules.find((r) => r.id === id) ?? null);
  }

  async matters(boardId?: string): Promise<Matter[]> {
    const all = [...this._matters.values()];
    return copy(boardId ? all.filter((m) => m.boardId === boardId) : all);
  }

  async matter(id: string): Promise<Matter | null> {
    const found = this._matters.get(id);
    return found ? copy(found) : null;
  }

  async briefings(): Promise<Briefing[]> {
    return copy(this._briefings);
  }

  async briefing(id: string): Promise<Briefing | null> {
    return copy(this._briefings.find((b) => b.id === id) ?? null);
  }

  async createMatter(matter: Matter): Promise<Matter> {
    if (this._matters.has(matter.id)) {
      throw new Error(`A matter with id ${matter.id} already exists.`);
    }
    this._matters.set(matter.id, copy(matter));
    return copy(matter);
  }

  async updateMatter(id: string, change: (current: Matter) => Matter): Promise<Matter> {
    const current = this._matters.get(id);
    if (!current) throw new NotFound('Matter', id);

    // The change runs against a copy, so a function that throws part-way
    // through cannot leave the stored matter half-modified.
    const next = change(copy(current));
    this._matters.set(id, copy(next));
    return copy(next);
  }

  async appendAssistantExchange(exchange: AssistantExchange): Promise<void> {
    this._log.push(copy(exchange));
    if (this._log.length > ASSISTANT_LOG_MAX) {
      this._log.splice(0, this._log.length - ASSISTANT_LOG_MAX);
    }
  }

  async assistantLog(limit?: number): Promise<AssistantExchange[]> {
    const newestFirst = [...this._log].reverse();
    return copy(limit ? newestFirst.slice(0, limit) : newestFirst);
  }

  async close(): Promise<void> {
    // Nothing to release.
  }
}
