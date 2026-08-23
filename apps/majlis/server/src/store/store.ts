/**
 * Gravitas Majlis — the store
 *
 * Stage One held the record in module-level arrays. That was honest for a
 * read-only stage: nothing was written, so nothing could be lost. Stage Two
 * writes, and a governance record that disappears on restart is not a record.
 *
 * Everything goes through this interface so the backend is a decision that can
 * be revisited. Today it is a SQLite file, which costs nothing and needs no
 * account. Before mainnet it wants automatic backups, and that is a different
 * implementation of these same methods rather than a different application.
 *
 * `updateMatter` takes a function rather than a finished object on purpose.
 * A board of five people will, sooner or later, have two of them close the same
 * vote in the same second. Read-then-write loses one of those votes and gives
 * no sign that it did. Passing the change in lets the store run read, modify and
 * write inside one transaction, which makes the race structurally impossible
 * rather than unlikely. The lifecycle functions are all pure Matter -> Matter,
 * so they drop straight in.
 */

import type { AssistantExchange, Board, Briefing, Matter, Rule } from '../types.js';

export class NotFound extends Error {
  constructor(what: string, id: string) {
    super(`${what} ${id} does not exist.`);
    this.name = 'NotFound';
  }
}

export interface Store {
  // ── the record, as Stage One exposed it ────────────────────────────────
  boards(): Promise<Board[]>;
  board(id: string): Promise<Board | null>;

  rules(boardId?: string): Promise<Rule[]>;
  rule(id: string): Promise<Rule | null>;

  matters(boardId?: string): Promise<Matter[]>;
  matter(id: string): Promise<Matter | null>;

  briefings(): Promise<Briefing[]>;
  briefing(id: string): Promise<Briefing | null>;

  // ── what Stage Two adds ────────────────────────────────────────────────

  /** @throws if a matter with this id already exists. */
  createMatter(matter: Matter): Promise<Matter>;

  /**
   * Read, change and write one matter atomically.
   * @throws NotFound if there is no such matter.
   * @throws whatever `change` throws — a lifecycle refusal passes through
   *         untouched and nothing is written.
   */
  updateMatter(id: string, change: (current: Matter) => Matter): Promise<Matter>;

  // ── the assistant log ──────────────────────────────────────────────────
  //
  // Part of the record rather than the record itself, and bounded: an
  // unbounded log in a long-running process is a leak.

  appendAssistantExchange(exchange: AssistantExchange): Promise<void>;
  assistantLog(limit?: number): Promise<AssistantExchange[]>;

  close(): Promise<void>;
}

/** How many exchanges the log keeps before the oldest are dropped. */
export const ASSISTANT_LOG_MAX = 1000;
