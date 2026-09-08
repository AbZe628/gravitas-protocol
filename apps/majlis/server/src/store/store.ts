/**
 * Gravitas Majlis — the store
 *
 * Stage One held the record in module-level arrays. That was honest for a
 * read-only stage: nothing was written, so nothing could be lost. Stage Two
 * writes, and a governance record that disappears on restart is not a record.
 *
 * Everything goes through this interface so the backend is a decision that can
 * be revisited. Today it is a JSON document written atomically, which costs
 * nothing, needs no account and needs no build toolchain — `file.ts` explains
 * why SQLite was tried and abandoned. Before mainnet it wants automatic
 * backups, and that is a different implementation of these same methods rather
 * than a different application.
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
import type { Signing } from '../services/signature.js';
import type { Credential } from '../services/account.js';
import type { Undertaking } from '../services/undertaking.js';

/**
 * A signature, with what it is a signature on.
 *
 * `Signing` itself is deliberately ignorant of storage — it is what the
 * document renderer needs and nothing else. The two identifying fields live
 * here so that a store can find them and a document cannot accidentally print
 * them.
 */
export interface StoredSigning extends Signing {
  matterId: string;
  boardId: string;
}

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

  // ── meetings ───────────────────────────────────────────────────────────
  //
  // Not append-only, and it is the exception that proves the rule. A meeting
  // is convened before it happens and filled in afterwards — attendance, then
  // the minute — so it has to be writable while it is open. Closing it is the
  // board approving the minute, and after that nothing changes: there is no
  // route to amend a closed one.

  meetings(boardId?: string): Promise<Meeting[]>;
  meeting(id: string): Promise<Meeting | null>;

  /** @throws if a meeting with this id already exists. */
  createMeeting(meeting: Meeting): Promise<Meeting>;

  /**
   * Read, change and write one meeting atomically.
   * @throws NotFound if there is no such meeting.
   */
  updateMeeting(id: string, change: (current: Meeting) => Meeting): Promise<Meeting>;

  // ── examining what was executed against what was approved ──────────────

  examinations(boardId?: string): Promise<Examination[]>;
  examination(id: string): Promise<Examination | null>;

  /**
   * Record one. There is no update: an examination is what somebody found on a
   * date, and a later look is a new examination naming the same ruling rather
   * than a rewrite of the first.
   *
   * @throws if an examination with this id already exists.
   */
  recordExamination(examination: Examination): Promise<Examination>;

  // ── signing the written decision ───────────────────────────────────────

  /** Every signature on this matter's document, oldest first. */
  signings(matterId: string): Promise<StoredSigning[]>;

  /**
   * Record one signature.
   *
   * Append-only, like a position. A member who signs, sees the document
   * amended, and signs again has done two things, and both stay visible: the
   * first signature is over a hash the document no longer has, and the page
   * says so beside their name. Overwriting it would erase the fact that they
   * were shown something else.
   *
   * There is deliberately no way to remove one.
   */
  recordSigning(signing: StoredSigning): Promise<StoredSigning>;

  // ── a member's own account ─────────────────────────────────────────────

  /**
   * The credential this member holds, or null.
   *
   * Null means nobody has set one in the store, and the environment file is
   * still the authority for them — which is the ordinary state of a fresh
   * installation and not a fault.
   */
  credential(scholarId: string): Promise<Credential | null>;

  /**
   * Write one, replacing whatever was there.
   *
   * There is no update-in-place: a credential is a small whole thing, and a
   * partial write is how an outstanding reset code survives a password change
   * it should have cleared.
   */
  putCredential(credential: Credential): Promise<Credential>;

  // ── what somebody undertook to do ──────────────────────────────────────

  undertakings(boardId?: string): Promise<Undertaking[]>;
  undertaking(id: string): Promise<Undertaking | null>;

  /** @throws if one with this id already exists. */
  minuteUndertaking(undertaking: Undertaking): Promise<Undertaking>;

  /**
   * Read, change and write one atomically.
   * @throws NotFound if there is no such undertaking.
   */
  updateUndertaking(id: string, change: (current: Undertaking) => Undertaking): Promise<Undertaking>;

  // ── the way in ─────────────────────────────────────────────────────────

  submissions(boardId?: string): Promise<Submission[]>;
  submission(id: string): Promise<Submission | null>;

  /** @throws if a submission with this id already exists. */
  createSubmission(submission: Submission): Promise<Submission>;

  /**
   * Read, change and write one submission atomically.
   *
   * The only change a caller may make is appending a disposition — the
   * question itself is never edited, which is enforced in
   * services/submission.ts rather than here, so the store stays a store.
   *
   * @throws NotFound if there is no such submission.
   */
  updateSubmission(id: string, change: (current: Submission) => Submission): Promise<Submission>;

  // ── the library as each board holds it ─────────────────────────────────
  //
  // Append-only, like the recorded calculations and for the same reason: a
  // board amends a shape by superseding its adoption, and the earlier version
  // stays because findings were recorded against it.

  adoptions(boardId?: string): Promise<AdoptedStructure[]>;
  adoption(id: string): Promise<AdoptedStructure | null>;

  /** @throws if an adoption with this id already exists. */
  recordAdoption(adoption: AdoptedStructure): Promise<AdoptedStructure>;

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
