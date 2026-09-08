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
import type {
  AdoptedStructure,
  Asset,
  AssistantExchange,
  Board,
  Briefing,
  Computation,
  Incident,
  Institution,
  Matter,
  Meeting,
  Rule,
  Submission,
  Examination,
} from '../types.js';
import {
  boards as seedBoards,
  briefings as seedBriefings,
  institutions as seedInstitutions,
  matters as seedMatters,
  rules as seedRules,
  assets as seedAssets,
} from '../data/seed.js';
import { ASSISTANT_LOG_MAX, NotFound, type Store, type StoredSigning } from './store.js';
import type { Credential } from '../services/account.js';
import type { Undertaking } from '../services/undertaking.js';

interface Document {
  version: 1;
  /** Whose boards these are. See store/tenant.ts for why this exists. */
  institutions?: Institution[];
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
  /**
   * Absent from every document written before incidents existed, which is why
   * nothing here assumes it. A record loaded from an older file is normalised
   * on the way in rather than migrated on disk: a store that rewrites a bank's
   * record merely because the code moved on is doing something nobody asked it
   * to do.
   */
  incidents?: Incident[];
  /**
   * Absent from every document written before the register existed, and
   * normalised in memory on the way in rather than migrated on disk. A store
   * that rewrites a bank's record because the code moved on is doing something
   * nobody asked it to do.
   */
  assets?: Asset[];
  computations?: Computation[];
  adoptions?: AdoptedStructure[];
  meetings?: Meeting[];
  submissions?: Submission[];
  examinations?: Examination[];
  /**
   * Signatures on written decisions. Append-only and not keyed by member,
   * because a member may sign more than once when a document is amended
   * between signings, and both are part of the record.
   */
  signings?: StoredSigning[];
  /** A member holds one credential or none; keyed rather than appended. */
  credentials?: Credential[];
  /** What somebody undertook to do at a sitting, and what became of it. */
  undertakings?: Undertaking[];
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

/**
 * MAJLIS_DB points somewhere this process cannot write.
 *
 * The usual cause on a hosting platform is a path under a volume that was never
 * mounted: the blueprint names one, nobody attached it, and the directory cannot
 * be created because the process is not root. The fix is a writable path or a
 * mounted disk, and the message says so rather than leaving a filesystem stack
 * trace to be decoded.
 */
export class StorePathError extends Error {
  constructor(file: string, readonly cause: unknown) {
    super(
      `MAJLIS_DB is set to "${file}", and its directory cannot be created: ` +
        `${cause instanceof Error ? cause.message : String(cause)}. ` +
        'Point it somewhere this process may write, or mount a volume at that path. ' +
        'Without a mounted volume the record is discarded on every deploy either way, ' +
        'so a writable temporary path loses nothing that was being kept.',
    );
    this.name = 'StorePathError';
  }
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

    try {
      mkdirSync(dirname(this.file), { recursive: true });
    } catch (cause) {
      throw new StorePathError(this.file, cause);
    }

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
      // Older documents have no incidents. Filled in memory, written only when
      // something is actually stored.
      loaded.incidents ??= [];
      loaded.assets ??= [];
      loaded.computations ??= [];
      loaded.adoptions ??= [];
      loaded.meetings ??= [];
      loaded.submissions ??= [];
      loaded.examinations ??= [];
      loaded.signings ??= [];
      loaded.credentials ??= [];
      loaded.undertakings ??= [];
      this.doc = loaded;
      return;
    }

    const startedAt = new Date().toISOString();
    this.doc =
      opts.seedIfEmpty === false
        ? {
            version: 1,
            startedAt,
            boards: [],
            rules: [],
            matters: [],
            incidents: [],
            assets: [],
            briefings: [],
            computations: [],
            adoptions: [],
            meetings: [],
            submissions: [],
            examinations: [],
          }
        : {
            version: 1,
            startedAt,
            institutions: copy(seedInstitutions),
            boards: copy(seedBoards),
            rules: copy(seedRules),
            matters: copy(seedMatters),
            // Nothing seeded: a demonstration record that opens with a breach
            // the board never reported would be a strange thing to show anyone.
            incidents: [],
            assets: copy(seedAssets),
            computations: [],
            adoptions: [],
            meetings: [],
            // Nothing seeded: a queue of questions nobody at the bank actually
            // asked would be words put in an institution's mouth.
            submissions: [],
            examinations: [],
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

  async institutions(): Promise<Institution[]> {
    return copy(this.doc.institutions ?? []);
  }

  async institution(id: string): Promise<Institution | null> {
    return copy((this.doc.institutions ?? []).find((i) => i.id === id) ?? null);
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

  async incidents(boardId?: string): Promise<Incident[]> {
    const all = this.doc.incidents ?? [];
    return copy(boardId ? all.filter((i) => i.boardId === boardId) : all);
  }

  async incident(id: string): Promise<Incident | null> {
    return copy((this.doc.incidents ?? []).find((i) => i.id === id) ?? null);
  }

  async createIncident(incident: Incident): Promise<Incident> {
    return this.serialise(() => {
      this.doc.incidents ??= [];
      if (this.doc.incidents.some((i) => i.id === incident.id)) {
        throw new Error(`An incident with id ${incident.id} already exists.`);
      }
      this.doc.incidents.push(copy(incident));
      this.persist();
      return copy(incident);
    });
  }

  async updateIncident(id: string, change: (current: Incident) => Incident): Promise<Incident> {
    return this.serialise(() => {
      this.doc.incidents ??= [];
      const index = this.doc.incidents.findIndex((i) => i.id === id);
      if (index === -1) throw new NotFound('Incident', id);

      // Runs against a copy and before persist(), so a refusal writes nothing.
      const next = change(copy(this.doc.incidents[index]));
      this.doc.incidents[index] = copy(next);
      this.persist();
      return copy(next);
    });
  }

  async assets(): Promise<Asset[]> {
    return copy(this.doc.assets ?? []);
  }

  async asset(id: string): Promise<Asset | null> {
    return copy((this.doc.assets ?? []).find((a) => a.id === id) ?? null);
  }

  async createAsset(asset: Asset): Promise<Asset> {
    return this.serialise(() => {
      this.doc.assets ??= [];
      if (this.doc.assets.some((a) => a.id === asset.id)) {
        throw new Error(`An asset with id ${asset.id} already exists.`);
      }
      this.doc.assets.push(copy(asset));
      this.persist();
      return copy(asset);
    });
  }

  async updateAsset(id: string, change: (current: Asset) => Asset): Promise<Asset> {
    return this.serialise(() => {
      this.doc.assets ??= [];
      const index = this.doc.assets.findIndex((a) => a.id === id);
      if (index === -1) throw new NotFound('Asset', id);

      // Runs against a copy and before persist(), so a refusal writes nothing.
      const next = change(copy(this.doc.assets[index]));
      this.doc.assets[index] = copy(next);
      this.persist();
      return copy(next);
    });
  }

  async computations(filter: { boardId?: string; kind?: string; assetId?: string } = {}): Promise<Computation[]> {
    return copy(
      (this.doc.computations ?? []).filter(
        (c) =>
          (filter.boardId === undefined || c.boardId === filter.boardId) &&
          (filter.kind === undefined || c.kind === filter.kind) &&
          (filter.assetId === undefined || c.assetId === filter.assetId),
      ),
    );
  }

  async computation(id: string): Promise<Computation | null> {
    return copy((this.doc.computations ?? []).find((c) => c.id === id) ?? null);
  }

  async recordComputation(computation: Computation): Promise<Computation> {
    return this.serialise(() => {
      this.doc.computations ??= [];
      if (this.doc.computations.some((c) => c.id === computation.id)) {
        throw new Error(`A computation with id ${computation.id} already exists.`);
      }
      this.doc.computations.push(copy(computation));
      this.persist();
      return copy(computation);
    });
  }

  async withdrawComputation(id: string, by: string, reason: string, at: string): Promise<Computation> {
    return this.serialise(() => {
      this.doc.computations ??= [];
      const index = this.doc.computations.findIndex((c) => c.id === id);
      if (index === -1) throw new NotFound('Computation', id);

      // The arithmetic is untouched. Only the withdrawal is written.
      const next = {
        ...copy(this.doc.computations[index]),
        withdrawnAt: at,
        withdrawnBy: by,
        withdrawalReason: reason,
      };
      this.doc.computations[index] = copy(next);
      this.persist();
      return copy(next);
    });
  }

  async adoptions(boardId?: string): Promise<AdoptedStructure[]> {
    const all = this.doc.adoptions ?? [];
    return copy(boardId === undefined ? all : all.filter((a) => a.boardId === boardId));
  }

  async adoption(id: string): Promise<AdoptedStructure | null> {
    return copy((this.doc.adoptions ?? []).find((a) => a.id === id) ?? null);
  }

  async recordAdoption(adoption: AdoptedStructure): Promise<AdoptedStructure> {
    return this.serialise(() => {
      this.doc.adoptions ??= [];
      if (this.doc.adoptions.some((a) => a.id === adoption.id)) {
        throw new Error(`An adoption with id ${adoption.id} already exists.`);
      }
      this.doc.adoptions.push(copy(adoption));
      this.persist();
      return copy(adoption);
    });
  }

  async meetings(boardId?: string): Promise<Meeting[]> {
    const all = this.doc.meetings ?? [];
    return copy(boardId === undefined ? all : all.filter((m) => m.boardId === boardId));
  }

  async meeting(id: string): Promise<Meeting | null> {
    return copy((this.doc.meetings ?? []).find((m) => m.id === id) ?? null);
  }

  async createMeeting(meeting: Meeting): Promise<Meeting> {
    return this.serialise(() => {
      this.doc.meetings ??= [];
      if (this.doc.meetings.some((m) => m.id === meeting.id)) {
        throw new Error(`A meeting with id ${meeting.id} already exists.`);
      }
      this.doc.meetings.push(copy(meeting));
      this.persist();
      return copy(meeting);
    });
  }

  async updateMeeting(id: string, change: (current: Meeting) => Meeting): Promise<Meeting> {
    return this.serialise(() => {
      this.doc.meetings ??= [];
      const index = this.doc.meetings.findIndex((m) => m.id === id);
      if (index === -1) throw new NotFound('Meeting', id);

      // Runs against a copy and before persist(), so a refusal writes nothing.
      const next = change(copy(this.doc.meetings[index]));
      this.doc.meetings[index] = copy(next);
      this.persist();
      return copy(next);
    });
  }

  async examinations(boardId?: string): Promise<Examination[]> {
    const all = this.doc.examinations ?? [];
    return copy(boardId === undefined ? all : all.filter((e) => e.boardId === boardId));
  }

  async examination(id: string): Promise<Examination | null> {
    return copy((this.doc.examinations ?? []).find((e) => e.id === id) ?? null);
  }

  async recordExamination(examination: Examination): Promise<Examination> {
    return this.serialise(() => {
      this.doc.examinations ??= [];
      if (this.doc.examinations.some((e) => e.id === examination.id)) {
        throw new Error(`An examination with id ${examination.id} already exists.`);
      }
      this.doc.examinations.push(copy(examination));
      this.persist();
      return copy(examination);
    });
  }

  async signings(matterId: string): Promise<StoredSigning[]> {
    return copy((this.doc.signings ?? []).filter((s) => s.matterId === matterId));
  }

  async credential(scholarId: string): Promise<Credential | null> {
    return copy((this.doc.credentials ?? []).find((c) => c.scholarId === scholarId) ?? null);
  }

  async undertakings(boardId?: string): Promise<Undertaking[]> {
    const all = this.doc.undertakings ?? [];
    return copy(boardId === undefined ? all : all.filter((u) => u.boardId === boardId));
  }

  async undertaking(id: string): Promise<Undertaking | null> {
    return copy((this.doc.undertakings ?? []).find((u) => u.id === id) ?? null);
  }

  async minuteUndertaking(undertaking: Undertaking): Promise<Undertaking> {
    return this.serialise(() => {
      this.doc.undertakings ??= [];
      if (this.doc.undertakings.some((u) => u.id === undertaking.id)) {
        throw new Error('An undertaking with id ' + undertaking.id + ' already exists.');
      }
      this.doc.undertakings.push(copy(undertaking));
      this.persist();
      return copy(undertaking);
    });
  }

  async updateUndertaking(
    id: string,
    change: (current: Undertaking) => Undertaking,
  ): Promise<Undertaking> {
    return this.serialise(() => {
      this.doc.undertakings ??= [];
      const at = this.doc.undertakings.findIndex((u) => u.id === id);
      if (at === -1) throw new NotFound('Undertaking', id);
      const next = change(copy(this.doc.undertakings[at]));
      this.doc.undertakings[at] = copy(next);
      this.persist();
      return copy(next);
    });
  }

  async putCredential(credential: Credential): Promise<Credential> {
    return this.serialise(() => {
      this.doc.credentials ??= [];
      const at = this.doc.credentials.findIndex((c) => c.scholarId === credential.scholarId);
      if (at === -1) this.doc.credentials.push(copy(credential));
      else this.doc.credentials[at] = copy(credential);
      this.persist();
      return copy(credential);
    });
  }

  async recordSigning(signing: StoredSigning): Promise<StoredSigning> {
    return this.serialise(() => {
      this.doc.signings ??= [];
      this.doc.signings.push(copy(signing));
      this.persist();
      return copy(signing);
    });
  }

  async submissions(boardId?: string): Promise<Submission[]> {
    const all = this.doc.submissions ?? [];
    return copy(boardId === undefined ? all : all.filter((s) => s.boardId === boardId));
  }

  async submission(id: string): Promise<Submission | null> {
    return copy((this.doc.submissions ?? []).find((s) => s.id === id) ?? null);
  }

  async createSubmission(submission: Submission): Promise<Submission> {
    return this.serialise(() => {
      this.doc.submissions ??= [];
      if (this.doc.submissions.some((s) => s.id === submission.id)) {
        throw new Error(`A submission with id ${submission.id} already exists.`);
      }
      this.doc.submissions.push(copy(submission));
      this.persist();
      return copy(submission);
    });
  }

  async updateSubmission(
    id: string,
    change: (current: Submission) => Submission,
  ): Promise<Submission> {
    return this.serialise(() => {
      this.doc.submissions ??= [];
      const index = this.doc.submissions.findIndex((s) => s.id === id);
      if (index === -1) throw new NotFound('Submission', id);

      // Runs against a copy and before persist(), so a refusal writes nothing.
      const next = change(copy(this.doc.submissions[index]));
      this.doc.submissions[index] = copy(next);
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
