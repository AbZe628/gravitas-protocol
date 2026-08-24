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

import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AssistantExchange, Board, Briefing, Matter, Rule } from '../types.js';
import { boards as seedBoards, briefings as seedBriefings, matters as seedMatters, rules as seedRules } from '../data/seed.js';
import { ASSISTANT_LOG_MAX, NotFound, type Store } from './store.js';

interface Document {
  version: 1;
  /**
   * When this record began. Written once, when the document is first created,
   * and carried through every write after that.
   *
   * Storage here is not durable: without a mounted disk the file is discarded on
   * every deploy and the record starts again from the seed. That is a deliberate
   * choice for now, not an accident, and this is what keeps it from being an
   * invisible one — a record dated an hour ago, shown to a room, says plainly
   * that it is a demonstration and not a board's history.
   */
  startedAt?: string;
  boards: Board[];
  rules: Rule[];
  matters: Matter[];
  briefings: Briefing[];
}

/*
 * The assistant log lives beside the record, not inside it, and is written one
 * JSON object per line.
 *
 * It is part of the record rather than the record itself: append-only, bounded,
 * and written far more often than a decision is taken. Keeping it in the same
 * document meant every question asked rewrote every matter the board had ever
 * decided — a thousand appends rewrote the whole document a thousand times, and
 * the cost grew with the log. Appending a line is flat, and the file is
 * compacted only when it drifts past the cap.
 */
const COMPACT_AT = ASSISTANT_LOG_MAX * 1.5;

const copy = <T>(value: T): T => structuredClone(value);

export interface FileStoreOptions {
  /** Path to the JSON document. Its directory is created if absent. */
  file: string;
  /** Load the demonstration record when the file does not yet exist. */
  seedIfEmpty?: boolean;
}

export class FileStore implements Store {
  private readonly file: string;
  private readonly logFile: string;
  private doc: Document;
  private log: AssistantExchange[];
  /** Mutations queue behind this, so no two can interleave around an await. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(opts: FileStoreOptions) {
    this.file = opts.file;
    this.logFile = opts.file.replace(/[.]json$/, '') + '.assistant.jsonl';
    mkdirSync(dirname(this.file), { recursive: true });

    this.log = existsSync(this.logFile) ? readLog(this.logFile) : [];

    if (existsSync(this.file)) {
      const loaded = JSON.parse(readFileSync(this.file, 'utf8')) as Document & {
        assistantLog?: AssistantExchange[];
      };
      // An earlier version kept the log inside the record. Carry it across
      // rather than dropping it, then leave it behind on the next write.
      if (loaded.assistantLog?.length) {
        this.log = [...loaded.assistantLog, ...this.log];
        writeLog(this.logFile, this.log);
        delete loaded.assistantLog;
      }
      this.doc = loaded;
      return;
    }

    const startedAt = new Date().toISOString();
    this.doc =
      opts.seedIfEmpty === false
        ? { version: 1, startedAt, boards: [], rules: [], matters: [], briefings: [] }
        : {
            version: 1,
            startedAt,
            boards: copy(seedBoards),
            rules: copy(seedRules),
            matters: copy(seedMatters),
            briefings: copy(seedBriefings),
          };
    this.persist();
  }

  /** When this record began, if it says. Older documents predate the field. */
  get startedAt(): string | null {
    return this.doc.startedAt ?? null;
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
      this.log.push(copy(exchange));
      appendFileSync(this.logFile, JSON.stringify(exchange) + '\n', 'utf8');

      // Trim in memory as soon as it is over, so a reader never sees more than
      // the cap, but rewrite the file only when it has drifted well past it.
      if (this.log.length > ASSISTANT_LOG_MAX) {
        this.log.splice(0, this.log.length - ASSISTANT_LOG_MAX);
      }
      if (countLines(this.logFile) > COMPACT_AT) writeLog(this.logFile, this.log);
    });
  }

  async assistantLog(limit?: number): Promise<AssistantExchange[]> {
    const newestFirst = [...this.log].reverse();
    return copy(limit ? newestFirst.slice(0, limit) : newestFirst);
  }

  async close(): Promise<void> {
    // Let anything still queued finish before the caller moves on.
    await this.queue;
  }
}

/** Read a JSON-lines log, skipping any line a crash left half-written. */
function readLog(file: string): AssistantExchange[] {
  const out: AssistantExchange[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as AssistantExchange);
    } catch {
      // A torn final line is the one thing an append-only file can leave
      // behind. Dropping it is right; refusing to start over it is not.
    }
  }
  return out.slice(-ASSISTANT_LOG_MAX);
}

function writeLog(file: string, entries: AssistantExchange[]): void {
  const temp = join(dirname(file), `.${Date.now()}-${process.pid}.log.tmp`);
  writeFileSync(temp, entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : ''), 'utf8');
  renameSync(temp, file);
}

function countLines(file: string): number {
  if (!existsSync(file)) return 0;
  const text = readFileSync(file, 'utf8');
  let n = 0;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}
