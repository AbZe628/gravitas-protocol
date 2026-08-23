/**
 * The SQLite store.
 *
 * A file on disk, no server, no account, no monthly bill. That is the right
 * trade for a stage whose purpose is to exercise the process before anything
 * rests on it — and the wrong one for production, because a file has no
 * automatic backups. Before mainnet this becomes another implementation of
 * `Store` pointed at something that does, and nothing above this file changes.
 *
 * The record is stored as documents rather than mapped across relational
 * tables. The domain types are the specification here — a `Matter` carries its
 * deliberation, its reasoning and its objections, and what a scholar signs in
 * Stage Three is a hash of parameters, not a join. Shredding that into tables
 * would buy queries nobody asks for and cost a migration every time a field
 * moves. The board id is lifted into a column because filtering by board is the
 * one query that is asked, and `plurality must be assumed from the first line`.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AssistantExchange, Board, Briefing, Matter, Rule } from '../types.js';
import { boards as seedBoards, briefings as seedBriefings, matters as seedMatters, rules as seedRules } from '../data/seed.js';
import { ASSISTANT_LOG_MAX, NotFound, type Store } from './store.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS boards    (id TEXT PRIMARY KEY, doc TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rules     (id TEXT PRIMARY KEY, board_id TEXT NOT NULL, doc TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS matters   (id TEXT PRIMARY KEY, board_id TEXT NOT NULL, doc TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS briefings (id TEXT PRIMARY KEY, doc TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assistant_log (seq INTEGER PRIMARY KEY AUTOINCREMENT, doc TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS rules_board   ON rules   (board_id);
CREATE INDEX IF NOT EXISTS matters_board ON matters (board_id);
`;

export interface SqliteOptions {
  /** ':memory:' for tests; a path for anything that has to survive a restart. */
  file: string;
  /** Load the demonstration record when the database is empty. */
  seedIfEmpty?: boolean;
}

export class SqliteStore implements Store {
  private readonly db: Database.Database;

  constructor(opts: SqliteOptions) {
    if (opts.file !== ':memory:') mkdirSync(dirname(opts.file), { recursive: true });
    this.db = new Database(opts.file);

    // Write-ahead logging: a reader is never blocked by the writer, and a
    // crash mid-write leaves the last committed state rather than a torn file.
    this.db.pragma('journal_mode = WAL');
    // Without this, SQLite does not enforce the foreign keys it accepts.
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA);

    if (opts.seedIfEmpty !== false) this.seedIfEmpty();
  }

  /** Load the seed record only into an empty database; never overwrite. */
  private seedIfEmpty(): void {
    const already = this.db.prepare('SELECT COUNT(*) AS n FROM boards').get() as { n: number };
    if (already.n > 0) return;

    const insertBoard = this.db.prepare('INSERT INTO boards (id, doc) VALUES (?, ?)');
    const insertRule = this.db.prepare('INSERT INTO rules (id, board_id, doc) VALUES (?, ?, ?)');
    const insertMatter = this.db.prepare('INSERT INTO matters (id, board_id, doc) VALUES (?, ?, ?)');
    const insertBriefing = this.db.prepare('INSERT INTO briefings (id, doc) VALUES (?, ?)');

    this.db.transaction(() => {
      for (const b of seedBoards) insertBoard.run(b.id, JSON.stringify(b));
      for (const r of seedRules) insertRule.run(r.id, r.boardId, JSON.stringify(r));
      for (const m of seedMatters) insertMatter.run(m.id, m.boardId, JSON.stringify(m));
      for (const b of seedBriefings) insertBriefing.run(b.id, JSON.stringify(b));
    })();
  }

  private all<T>(sql: string, ...params: unknown[]): T[] {
    return (this.db.prepare(sql).all(...params) as { doc: string }[]).map((r) => JSON.parse(r.doc) as T);
  }

  private one<T>(sql: string, ...params: unknown[]): T | null {
    const row = this.db.prepare(sql).get(...params) as { doc: string } | undefined;
    return row ? (JSON.parse(row.doc) as T) : null;
  }

  async boards(): Promise<Board[]> {
    return this.all<Board>('SELECT doc FROM boards ORDER BY id');
  }

  async board(id: string): Promise<Board | null> {
    return this.one<Board>('SELECT doc FROM boards WHERE id = ?', id);
  }

  async rules(boardId?: string): Promise<Rule[]> {
    return boardId
      ? this.all<Rule>('SELECT doc FROM rules WHERE board_id = ? ORDER BY id', boardId)
      : this.all<Rule>('SELECT doc FROM rules ORDER BY id');
  }

  async rule(id: string): Promise<Rule | null> {
    return this.one<Rule>('SELECT doc FROM rules WHERE id = ?', id);
  }

  async matters(boardId?: string): Promise<Matter[]> {
    return boardId
      ? this.all<Matter>('SELECT doc FROM matters WHERE board_id = ? ORDER BY id', boardId)
      : this.all<Matter>('SELECT doc FROM matters ORDER BY id');
  }

  async matter(id: string): Promise<Matter | null> {
    return this.one<Matter>('SELECT doc FROM matters WHERE id = ?', id);
  }

  async briefings(): Promise<Briefing[]> {
    return this.all<Briefing>('SELECT doc FROM briefings ORDER BY id');
  }

  async briefing(id: string): Promise<Briefing | null> {
    return this.one<Briefing>('SELECT doc FROM briefings WHERE id = ?', id);
  }

  async createMatter(matter: Matter): Promise<Matter> {
    try {
      this.db
        .prepare('INSERT INTO matters (id, board_id, doc) VALUES (?, ?, ?)')
        .run(matter.id, matter.boardId, JSON.stringify(matter));
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint/.test(error.message)) {
        throw new Error(`A matter with id ${matter.id} already exists.`);
      }
      throw error;
    }
    return structuredClone(matter);
  }

  /**
   * Read, change and write in one transaction.
   *
   * If `change` throws — a lifecycle refusal, most often — the transaction
   * rolls back and the stored matter is untouched. Two members closing the same
   * vote in the same second cannot interleave: the second one sees what the
   * first wrote and refuses on `already_voted` or `wrong_status`, which is the
   * correct outcome and a legible one.
   */
  async updateMatter(id: string, change: (current: Matter) => Matter): Promise<Matter> {
    const read = this.db.prepare('SELECT doc FROM matters WHERE id = ?');
    const write = this.db.prepare('UPDATE matters SET board_id = ?, doc = ? WHERE id = ?');

    const run = this.db.transaction(() => {
      const row = read.get(id) as { doc: string } | undefined;
      if (!row) throw new NotFound('Matter', id);
      const next = change(JSON.parse(row.doc) as Matter);
      write.run(next.boardId, JSON.stringify(next), id);
      return next;
    });

    return run();
  }

  async appendAssistantExchange(exchange: AssistantExchange): Promise<void> {
    const insert = this.db.prepare('INSERT INTO assistant_log (doc) VALUES (?)');
    const trim = this.db.prepare(
      'DELETE FROM assistant_log WHERE seq <= (SELECT MAX(seq) FROM assistant_log) - ?'
    );
    this.db.transaction(() => {
      insert.run(JSON.stringify(exchange));
      trim.run(ASSISTANT_LOG_MAX);
    })();
  }

  async assistantLog(limit?: number): Promise<AssistantExchange[]> {
    return limit
      ? this.all<AssistantExchange>('SELECT doc FROM assistant_log ORDER BY seq DESC LIMIT ?', limit)
      : this.all<AssistantExchange>('SELECT doc FROM assistant_log ORDER BY seq DESC');
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
