/**
 * The file-backed store.
 *
 * A JSON document written atomically. No database server, no account, no
 * monthly bill, and — the part that decided it — no native code. The first
 * attempt at this used SQLite, which is the better tool in general and the
 * wrong one here: the native addon needed a build toolchain on every host,
 * declared an engine range CI did not satisfy, and killed the test worker
 * outright rather than failing in a way a test could report.
 *
 * At this size the trade is not close. A board is five people; a record is
 * matters, deliberations and votes, measured in kilobytes. SQLite's advantages
 * — indexed queries over large tables, partial reads — are advantages this
 * workload never asks for, and the cost was paid on every install.
 *
 * What it must still get right:
 *
 *   **A crash must not truncate the record.** Every write goes to a temporary
 *   file which is then renamed over the real one. Rename is atomic, so a reader
 *   — or the next process after a crash — sees either the previous complete
 *   record or the new complete one, never a half-written file.
 *
 *   **Two writers must not interleave.** Node is single-threaded but `await`
 *   yields, so two requests can interleave around a write. Every mutation is
 *   queued behind the one before it, which makes read-modify-write atomic in
 *   the only sense that matters here.
 *
 * Before mainnet this becomes another implementation of `Store` pointed at
 * something with automatic backups. Nothing above this file changes.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AssistantExchange, Board, Briefing, Matter, Rule } from '../types.js';
import { boards as seedBoards, briefings as seedBriefings, matters as seedMatters, rules as seedRules } from '../data/seed.js';
import { ASSISTANT_LOG_MAX, NotFound, type Store } from './store.js';

interface Document {
  version: 1;
  boards: Board[];
  rules: Rule[];
  matters: Matter[];
  briefings: Briefing[];
  assistantLog: AssistantExchange[];
}

const copy = <T>(value: T): T => structuredClone(value);

export interface FileStoreOptions {
  /** Path to the JSON document. Its directory is created if absent. */
  file: string;
  /** Load the demonstration record when the file does not yet exist. */
  seedIfEmpty?: boolean;
}

export class FileStore implements Store {
  private readonly file: string;
  private doc: Document;
  /** Mutations queue behind this, so no two can interleave around an await. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(opts: FileStoreOptions) {
    this.file = opts.file;
    mkdirSync(dirname(this.file), { recursive: true });

    if (existsSync(this.file)) {
      this.doc = JSON.parse(readFileSync(this.file, 'utf8')) as Document;
      return;
    }

    this.doc =
      opts.seedIfEmpty === false
        ? { version: 1, boards: [], rules: [], matters: [], briefings: [], assistantLog: [] }
        : {
            version: 1,
            boards: copy(seedBoards),
            rules: copy(seedRules),
            matters: copy(seedMatters),
            briefings: copy(seedBriefings),
            assistantLog: [],
          };
    this.persist();
  }

  /**
   * Write to a temporary file, then rename it over the real one. Rename is
   * atomic, so nothing ever observes a partially written record.
   */
  private persist(): void {
    const temp = join(dirname(this.file), `.${Date.now()}-${process.pid}.tmp`);
    writeFileSync(temp, JSON.stringify(this.doc, null, 2), 'utf8');
    renameSync(temp, this.file);
  }

  /** Run a mutation after every mutation queued before it. */
  private serialise<T>(work: () => T): Promise<T> {
    const next = this.queue.then(work, work);
    // Keep the chain alive even when a mutation rejects, and do not let an
    // unhandled rejection escape from the queue itself.
    this.queue = next.catch(() => undefined);
    return next;
  }

  async boards(): Promise<Board[]> {
    return copy(this.doc.boards);
  }

  async board(id: string): Promise<Board | null> {
    return copy(this.doc.boards.find((b) => b.id === id) ?? null);
  }

  async rules(boardId?: string): Promise<Rule[]> {
    return copy(boardId ? this.doc.rules.filter((r) => r.boardId === boardId) : this.doc.rules);
  }

  async rule(id: string): Promise<Rule | null> {
    return copy(this.doc.rules.find((r) => r.id === id) ?? null);
  }

  async matters(boardId?: string): Promise<Matter[]> {
    return copy(boardId ? this.doc.matters.filter((m) => m.boardId === boardId) : this.doc.matters);
  }

  async matter(id: string): Promise<Matter | null> {
    return copy(this.doc.matters.find((m) => m.id === id) ?? null);
  }

  async briefings(): Promise<Briefing[]> {
    return copy(this.doc.briefings);
  }

  async briefing(id: string): Promise<Briefing | null> {
    return copy(this.doc.briefings.find((b) => b.id === id) ?? null);
  }

  async createMatter(matter: Matter): Promise<Matter> {
    return this.serialise(() => {
      if (this.doc.matters.some((m) => m.id === matter.id)) {
        throw new Error(`A matter with id ${matter.id} already exists.`);
      }
      this.doc.matters.push(copy(matter));
      this.persist();
      return copy(matter);
    });
  }

  async updateMatter(id: string, change: (current: Matter) => Matter): Promise<Matter> {
    return this.serialise(() => {
      const index = this.doc.matters.findIndex((m) => m.id === id);
      if (index === -1) throw new NotFound('Matter', id);

      // The change runs against a copy, so a function that throws part way
      // through cannot leave the stored matter half-modified — and because it
      // runs before persist(), a refusal writes nothing at all.
      const next = change(copy(this.doc.matters[index]));
      this.doc.matters[index] = copy(next);
      this.persist();
      return copy(next);
    });
  }

  async appendAssistantExchange(exchange: AssistantExchange): Promise<void> {
    await this.serialise(() => {
      this.doc.assistantLog.push(copy(exchange));
      if (this.doc.assistantLog.length > ASSISTANT_LOG_MAX) {
        this.doc.assistantLog.splice(0, this.doc.assistantLog.length - ASSISTANT_LOG_MAX);
      }
      this.persist();
    });
  }

  async assistantLog(limit?: number): Promise<AssistantExchange[]> {
    const newestFirst = [...this.doc.assistantLog].reverse();
    return copy(limit ? newestFirst.slice(0, limit) : newestFirst);
  }

  async close(): Promise<void> {
    // Let anything still queued finish before the caller moves on.
    await this.queue;
  }
}
