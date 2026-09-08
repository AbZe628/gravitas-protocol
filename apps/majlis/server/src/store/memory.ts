/**
 * The in-memory store.
 *
 * This is what the tests run against and what `npm run dev` uses when no
 * record file is configured. It is also the reference: the file-backed store is
 * held to the same contract suite, so a disagreement between them is a failing
 * test rather than a surprise in production.
 *
 * Everything is deep-copied on the way in and on the way out. A store that
 * hands out references to its own state lets a caller mutate the record by
 * accident, and the bug that produces surfaces far away from the cause.
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
import type { Annotation } from '../services/annotation.js';

const copy = <T>(value: T): T => structuredClone(value);

export interface MemorySeed {
  institutions?: Institution[];
  boards?: Board[];
  rules?: Rule[];
  matters?: Matter[];
  incidents?: Incident[];
  assets?: Asset[];
  briefings?: Briefing[];
  computations?: Computation[];
  adoptions?: AdoptedStructure[];
  meetings?: Meeting[];
  submissions?: Submission[];
  examinations?: Examination[];
  undertakings?: Undertaking[];
  annotations?: Annotation[];
}

export class MemoryStore implements Store {
  /** Nothing here outlives the process, so the record began when it did. */
  readonly startedAt: string = new Date().toISOString();

  private readonly _institutions: Institution[];
  private readonly _boards: Board[];
  private readonly _rules: Rule[];
  private readonly _matters: Map<string, Matter>;
  private readonly _incidents: Map<string, Incident>;
  private readonly _assets: Map<string, Asset>;
  private readonly _briefings: Briefing[];
  private readonly _computations: Map<string, Computation>;
  private readonly _adoptions: Map<string, AdoptedStructure>;
  private readonly _meetings: Map<string, Meeting>;
  private readonly _submissions: Map<string, Submission>;
  private readonly _examinations: Map<string, Examination>;
  /**
   * An array, not a map. A signature has no id worth having, and a member may
   * hold more than one on the same matter when the document was amended
   * between them — a map keyed by member would silently drop the earlier.
   */
  private readonly _signings: StoredSigning[] = [];
  /** Keyed by scholar: a member holds one credential or none. */
  private readonly _credentials = new Map<string, Credential>();
  private readonly _undertakings: Map<string, Undertaking>;
  private readonly _annotations: Map<string, Annotation>;
  private readonly _log: AssistantExchange[] = [];

  constructor(seed: MemorySeed = {}) {
    this._institutions = copy(seed.institutions ?? seedInstitutions);
    this._boards = copy(seed.boards ?? seedBoards);
    this._rules = copy(seed.rules ?? seedRules);
    this._briefings = copy(seed.briefings ?? seedBriefings);
    this._matters = new Map((seed.matters ?? seedMatters).map((m) => [m.id, copy(m)]));
    // A bare store is an empty record, and stays one: what a board with
    // nothing reported looks like is a thing worth being able to test.
    this._incidents = new Map((seed.incidents ?? []).map((i) => [i.id, copy(i)]));
    this._assets = new Map((seed.assets ?? seedAssets).map((a) => [a.id, copy(a)]));
    // Nothing seeded: a demonstration record opening with a zakat somebody
    // already computed would be putting a figure in a board's mouth.
    this._computations = new Map((seed.computations ?? []).map((c) => [c.id, copy(c)]));
    // Nothing seeded: a demonstration record where the library was already
    // adopted would be showing a decision no board in it ever took.
    this._adoptions = new Map((seed.adoptions ?? []).map((a) => [a.id, copy(a)]));
    this._meetings = new Map((seed.meetings ?? []).map((m) => [m.id, copy(m)]));
    // Nothing seeded by default: a queue of questions nobody at the bank
    // actually asked would be words in an institution's mouth.
    this._submissions = new Map((seed.submissions ?? []).map((x) => [x.id, copy(x)]));
    // Nothing seeded: an examination nobody carried out would be the strongest
    // claim in the record and the one least earned.
    this._examinations = new Map((seed.examinations ?? []).map((x) => [x.id, copy(x)]));
    this._undertakings = new Map((seed.undertakings ?? []).map((u) => [u.id, copy(u)]));
    this._annotations = new Map((seed.annotations ?? []).map((a) => [a.id, copy(a)]));
  }

  async institutions(): Promise<Institution[]> {
    return copy(this._institutions);
  }

  async institution(id: string): Promise<Institution | null> {
    return copy(this._institutions.find((i) => i.id === id) ?? null);
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

  async incidents(boardId?: string): Promise<Incident[]> {
    const all = [...this._incidents.values()];
    return copy(boardId ? all.filter((i) => i.boardId === boardId) : all);
  }

  async incident(id: string): Promise<Incident | null> {
    const found = this._incidents.get(id);
    return found ? copy(found) : null;
  }

  async createIncident(incident: Incident): Promise<Incident> {
    if (this._incidents.has(incident.id)) {
      throw new Error(`An incident with id ${incident.id} already exists.`);
    }
    this._incidents.set(incident.id, copy(incident));
    return copy(incident);
  }

  async updateIncident(id: string, change: (current: Incident) => Incident): Promise<Incident> {
    const current = this._incidents.get(id);
    if (!current) throw new NotFound('Incident', id);

    const next = change(copy(current));
    this._incidents.set(id, copy(next));
    return copy(next);
  }

  async assets(): Promise<Asset[]> {
    return copy([...this._assets.values()]);
  }

  async asset(id: string): Promise<Asset | null> {
    const found = this._assets.get(id);
    return found ? copy(found) : null;
  }

  async createAsset(asset: Asset): Promise<Asset> {
    if (this._assets.has(asset.id)) {
      throw new Error(`An asset with id ${asset.id} already exists.`);
    }
    this._assets.set(asset.id, copy(asset));
    return copy(asset);
  }

  async updateAsset(id: string, change: (current: Asset) => Asset): Promise<Asset> {
    const current = this._assets.get(id);
    if (!current) throw new NotFound('Asset', id);

    const next = change(copy(current));
    this._assets.set(id, copy(next));
    return copy(next);
  }

  async computations(filter: { boardId?: string; kind?: string; assetId?: string } = {}): Promise<Computation[]> {
    return copy(
      [...this._computations.values()].filter(
        (c) =>
          (filter.boardId === undefined || c.boardId === filter.boardId) &&
          (filter.kind === undefined || c.kind === filter.kind) &&
          (filter.assetId === undefined || c.assetId === filter.assetId),
      ),
    );
  }

  async computation(id: string): Promise<Computation | null> {
    const found = this._computations.get(id);
    return found ? copy(found) : null;
  }

  async recordComputation(computation: Computation): Promise<Computation> {
    if (this._computations.has(computation.id)) {
      throw new Error(`A computation with id ${computation.id} already exists.`);
    }
    this._computations.set(computation.id, copy(computation));
    return copy(computation);
  }

  async withdrawComputation(id: string, by: string, reason: string, at: string): Promise<Computation> {
    const current = this._computations.get(id);
    if (!current) throw new NotFound('Computation', id);

    const next = { ...copy(current), withdrawnAt: at, withdrawnBy: by, withdrawalReason: reason };
    this._computations.set(id, copy(next));
    return copy(next);
  }

  async adoptions(boardId?: string): Promise<AdoptedStructure[]> {
    const all = [...this._adoptions.values()];
    return copy(boardId === undefined ? all : all.filter((a) => a.boardId === boardId));
  }

  async adoption(id: string): Promise<AdoptedStructure | null> {
    const found = this._adoptions.get(id);
    return found ? copy(found) : null;
  }

  async recordAdoption(adoption: AdoptedStructure): Promise<AdoptedStructure> {
    if (this._adoptions.has(adoption.id)) {
      throw new Error(`An adoption with id ${adoption.id} already exists.`);
    }
    this._adoptions.set(adoption.id, copy(adoption));
    return copy(adoption);
  }

  async meetings(boardId?: string): Promise<Meeting[]> {
    const all = [...this._meetings.values()];
    return copy(boardId === undefined ? all : all.filter((m) => m.boardId === boardId));
  }

  async meeting(id: string): Promise<Meeting | null> {
    const found = this._meetings.get(id);
    return found ? copy(found) : null;
  }

  async createMeeting(meeting: Meeting): Promise<Meeting> {
    if (this._meetings.has(meeting.id)) {
      throw new Error(`A meeting with id ${meeting.id} already exists.`);
    }
    this._meetings.set(meeting.id, copy(meeting));
    return copy(meeting);
  }

  async updateMeeting(id: string, change: (current: Meeting) => Meeting): Promise<Meeting> {
    const current = this._meetings.get(id);
    if (!current) throw new NotFound('Meeting', id);

    const next = change(copy(current));
    this._meetings.set(id, copy(next));
    return copy(next);
  }

  async examinations(boardId?: string): Promise<Examination[]> {
    const all = [...this._examinations.values()];
    return copy(boardId === undefined ? all : all.filter((e) => e.boardId === boardId));
  }

  async examination(id: string): Promise<Examination | null> {
    const found = this._examinations.get(id);
    return found ? copy(found) : null;
  }

  async recordExamination(examination: Examination): Promise<Examination> {
    if (this._examinations.has(examination.id)) {
      throw new Error(`An examination with id ${examination.id} already exists.`);
    }
    this._examinations.set(examination.id, copy(examination));
    return copy(examination);
  }

  async signings(matterId: string): Promise<StoredSigning[]> {
    return copy(this._signings.filter((s) => s.matterId === matterId));
  }

  async credential(scholarId: string): Promise<Credential | null> {
    const found = this._credentials.get(scholarId);
    return found ? copy(found) : null;
  }

  async undertakings(boardId?: string): Promise<Undertaking[]> {
    const all = [...this._undertakings.values()];
    return copy(boardId === undefined ? all : all.filter((u) => u.boardId === boardId));
  }

  async undertaking(id: string): Promise<Undertaking | null> {
    const found = this._undertakings.get(id);
    return found ? copy(found) : null;
  }

  async minuteUndertaking(undertaking: Undertaking): Promise<Undertaking> {
    if (this._undertakings.has(undertaking.id)) {
      throw new Error(`An undertaking with id ${undertaking.id} already exists.`);
    }
    this._undertakings.set(undertaking.id, copy(undertaking));
    return copy(undertaking);
  }

  async updateUndertaking(
    id: string,
    change: (current: Undertaking) => Undertaking,
  ): Promise<Undertaking> {
    const current = this._undertakings.get(id);
    if (!current) throw new NotFound('Undertaking', id);
    const next = change(copy(current));
    this._undertakings.set(id, copy(next));
    return copy(next);
  }

  async annotations(subjectId?: string): Promise<Annotation[]> {
    const all = [...this._annotations.values()];
    return copy(subjectId === undefined ? all : all.filter((a) => a.subjectId === subjectId));
  }

  async annotation(id: string): Promise<Annotation | null> {
    const found = this._annotations.get(id);
    return found ? copy(found) : null;
  }

  async markAnnotation(annotation: Annotation): Promise<Annotation> {
    if (this._annotations.has(annotation.id)) {
      throw new Error(`A note with id ${annotation.id} already exists.`);
    }
    this._annotations.set(annotation.id, copy(annotation));
    return copy(annotation);
  }

  async updateAnnotation(
    id: string,
    change: (current: Annotation) => Annotation,
  ): Promise<Annotation> {
    const current = this._annotations.get(id);
    if (!current) throw new NotFound('Note', id);
    const next = change(copy(current));
    this._annotations.set(id, copy(next));
    return copy(next);
  }

  async putCredential(credential: Credential): Promise<Credential> {
    this._credentials.set(credential.scholarId, copy(credential));
    return copy(credential);
  }

  async recordSigning(signing: StoredSigning): Promise<StoredSigning> {
    this._signings.push(copy(signing));
    return copy(signing);
  }

  async submissions(boardId?: string): Promise<Submission[]> {
    const all = [...this._submissions.values()];
    return copy(boardId === undefined ? all : all.filter((s) => s.boardId === boardId));
  }

  async submission(id: string): Promise<Submission | null> {
    const found = this._submissions.get(id);
    return found ? copy(found) : null;
  }

  async createSubmission(submission: Submission): Promise<Submission> {
    if (this._submissions.has(submission.id)) {
      throw new Error(`A submission with id ${submission.id} already exists.`);
    }
    this._submissions.set(submission.id, copy(submission));
    return copy(submission);
  }

  async updateSubmission(
    id: string,
    change: (current: Submission) => Submission,
  ): Promise<Submission> {
    const current = this._submissions.get(id);
    if (!current) throw new NotFound('Submission', id);

    const next = change(copy(current));
    this._submissions.set(id, copy(next));
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
