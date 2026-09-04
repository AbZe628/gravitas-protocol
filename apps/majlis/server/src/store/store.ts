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

import type {
  Asset,
  AssistantExchange,
  Board,
  Briefing,
  Computation,
  Incident,
  Institution,
  Matter,
  Rule,
} from '../types.js';

export class NotFound extends Error {
  constructor(what: string, id: string) {
    super(`${what} ${id} does not exist.`);
    this.name = 'NotFound';
  }
}

export interface Store {
  /**
   * The institutions this store can see. A scoped store sees exactly one.
   */
  institutions(): Promise<Institution[]>;
  institution(id: string): Promise<Institution | null>;

  /**
   * When this record began, if it knows. Null means it cannot say, which is
   * itself an answer and better than a date it made up.
   */
  readonly startedAt?: string | null;

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

  // ── reported non-compliance ────────────────────────────────────────────
  //
  // Kept apart from matters because it is not one. A matter is a proposal to
  // change a rule; an incident is an account of something that already
  // happened, and the board's act on it is a determination rather than a vote
  // on terms. The same shape would have hidden the difference that matters:
  // once the board finds an event actual, a clock runs that the institution is
  // judged on.

  incidents(boardId?: string): Promise<Incident[]>;
  incident(id: string): Promise<Incident | null>;

  /** @throws if an incident with this id already exists. */
  createIncident(incident: Incident): Promise<Incident>;

  /**
   * Read, change and write one incident atomically.
   * @throws NotFound if there is no such incident.
   * @throws whatever `change` throws — a refusal passes through untouched and
   *         nothing is written.
   */
  updateIncident(id: string, change: (current: Incident) => Incident): Promise<Incident>;

  // ── the register ───────────────────────────────────────────────────────
  //
  // What the board rules on. Scoped by institution directly rather than through
  // a board, because an asset belongs to the institution that holds it and not
  // to the committee that ruled on it — two boards of one bank look at the same
  // universe.

  assets(): Promise<Asset[]>;
  asset(id: string): Promise<Asset | null>;

  /** @throws if an asset with this id already exists. */
  createAsset(asset: Asset): Promise<Asset>;

  /**
   * Read, change and write one asset atomically.
   * @throws NotFound if there is no such asset.
   */
  updateAsset(id: string, change: (current: Asset) => Asset): Promise<Asset>;

  // ── recorded calculations ──────────────────────────────────────────────
  //
  // Append-only. There is deliberately no update: a corrected figure is a new
  // computation naming the old in `supersedes`, and which are superseded is
  // derived by looking rather than stored, so the two can never disagree.
  //
  // Withdrawal is the one exception and is not an edit of the arithmetic: it
  // marks a record as withdrawn, with a name and a reason, and removes nothing.

  computations(filter?: { boardId?: string; kind?: string; assetId?: string }): Promise<Computation[]>;
  computation(id: string): Promise<Computation | null>;

  /** @throws if a computation with this id already exists. */
  recordComputation(computation: Computation): Promise<Computation>;

  /**
   * Mark one withdrawn. The record stays and the arithmetic is untouched.
   * @throws NotFound if there is no such computation.
   */
  withdrawComputation(id: string, by: string, reason: string, at: string): Promise<Computation>;

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
