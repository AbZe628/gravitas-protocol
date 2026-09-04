import type {
  AssistantExchange,
  Board,
  Asset,
  Briefing,
  Computation,
  Incident,
  Institution,
  Matter,
  Rule,
} from '../types.js';
import { NotFound, type Store } from './store.js';

/**
 * A store that can only see one institution.
 *
 * **No bank shares a database with another bank.** The question is where that
 * is enforced, and the answer is here rather than in the routes. There are
 * thirty-two routes and twelve store methods: scoping the routes would be
 * thirty-two chances to forget, and forgetting once means one institution's
 * deliberation reaching another. A route is handed a store that is already
 * scoped, so it cannot reach outside it even if it tries.
 *
 * Two rules run through everything below.
 *
 * **Absence, not refusal.** Asking for something that belongs to another
 * institution returns null, exactly as asking for something that does not exist
 * does. A store that answered "you may not see that" would confirm it exists,
 * and an outsider could map another institution's record by probing for
 * refusals.
 *
 * **Writes are checked, not filtered.** A read that finds nothing is ordinary;
 * a write aimed outside the institution is a fault in the caller and is
 * refused loudly, because silently dropping it would leave the caller believing
 * it happened.
 *
 * A single deployment per institution is still the arrangement a bank will ask
 * for, and this does not replace it. It makes the record correct either way, so
 * serving two institutions becomes a deployment decision rather than a rewrite.
 */
export class TenantStore implements Store {
  constructor(
    private readonly inner: Store,
    readonly institutionId: string,
  ) {}

  get startedAt(): string | null | undefined {
    return this.inner.startedAt;
  }

  // ── the institution itself ──────────────────────────────────────────────

  async institutions(): Promise<Institution[]> {
    const one = await this.inner.institution(this.institutionId);
    return one ? [one] : [];
  }

  async institution(id: string): Promise<Institution | null> {
    return id === this.institutionId ? this.inner.institution(id) : null;
  }

  // ── boards, and everything that hangs off one ───────────────────────────

  private async ownBoardIds(): Promise<Set<string>> {
    const boards = await this.inner.boards();
    return new Set(boards.filter((b) => b.institutionId === this.institutionId).map((b) => b.id));
  }

  private async owns(boardId: string): Promise<boolean> {
    const board = await this.inner.board(boardId);
    return board?.institutionId === this.institutionId;
  }

  async boards(): Promise<Board[]> {
    const boards = await this.inner.boards();
    return boards.filter((b) => b.institutionId === this.institutionId);
  }

  async board(id: string): Promise<Board | null> {
    const board = await this.inner.board(id);
    return board?.institutionId === this.institutionId ? board : null;
  }

  async rules(boardId?: string): Promise<Rule[]> {
    // Asking for another institution's board is answered as an empty board,
    // not as a refusal.
    if (boardId && !(await this.owns(boardId))) return [];
    const mine = await this.ownBoardIds();
    const rules = await this.inner.rules(boardId);
    return rules.filter((r) => mine.has(r.boardId));
  }

  async rule(id: string): Promise<Rule | null> {
    const rule = await this.inner.rule(id);
    if (!rule) return null;
    return (await this.owns(rule.boardId)) ? rule : null;
  }

  async matters(boardId?: string): Promise<Matter[]> {
    if (boardId && !(await this.owns(boardId))) return [];
    const mine = await this.ownBoardIds();
    const matters = await this.inner.matters(boardId);
    return matters.filter((m) => mine.has(m.boardId));
  }

  async matter(id: string): Promise<Matter | null> {
    const matter = await this.inner.matter(id);
    if (!matter) return null;
    return (await this.owns(matter.boardId)) ? matter : null;
  }

  async createMatter(matter: Matter): Promise<Matter> {
    if (!(await this.owns(matter.boardId))) {
      throw new OutsideInstitution('create a matter on', matter.boardId);
    }
    return this.inner.createMatter(matter);
  }

  async updateMatter(id: string, change: (current: Matter) => Matter): Promise<Matter> {
    const matter = await this.inner.matter(id);
    // Indistinguishable from a matter that does not exist, deliberately.
    if (!matter || !(await this.owns(matter.boardId))) throw new NotFound('matter', id);

    return this.inner.updateMatter(id, (current) => {
      const next = change(current);
      // A change may not move a matter out of the institution it belongs to.
      if (next.boardId !== current.boardId) {
        throw new OutsideInstitution('move a matter to', next.boardId);
      }
      return next;
    });
  }

  // ── incidents ───────────────────────────────────────────────────────────
  //
  // Scoped exactly as matters are, and for a sharper reason. A reported
  // non-compliance names an activity a bank has stopped, an amount it owes to
  // charity and a filing it has made to its regulator. There is very little in
  // an institution's record it would rather a competitor could not read.

  async incidents(boardId?: string): Promise<Incident[]> {
    if (boardId && !(await this.owns(boardId))) return [];
    const mine = await this.ownBoardIds();
    const incidents = await this.inner.incidents(boardId);
    return incidents.filter((i) => mine.has(i.boardId));
  }

  async incident(id: string): Promise<Incident | null> {
    const incident = await this.inner.incident(id);
    if (!incident) return null;
    return (await this.owns(incident.boardId)) ? incident : null;
  }

  async createIncident(incident: Incident): Promise<Incident> {
    if (!(await this.owns(incident.boardId))) {
      throw new OutsideInstitution('report an incident on', incident.boardId);
    }
    return this.inner.createIncident(incident);
  }

  async updateIncident(id: string, change: (current: Incident) => Incident): Promise<Incident> {
    const incident = await this.inner.incident(id);
    // Indistinguishable from one that does not exist, deliberately.
    if (!incident || !(await this.owns(incident.boardId))) throw new NotFound('incident', id);

    return this.inner.updateIncident(id, (current) => {
      const next = change(current);
      if (next.boardId !== current.boardId) {
        throw new OutsideInstitution('move an incident to', next.boardId);
      }
      return next;
    });
  }

  // ── the register ────────────────────────────────────────────────────────
  //
  // Simpler than everything above it: an asset carries its institution
  // directly rather than inheriting one through a board, so the check is a
  // comparison rather than a lookup. The rules are the same — absence rather
  // than refusal on a read, loud refusal on a write.

  async assets(): Promise<Asset[]> {
    const all = await this.inner.assets();
    return all.filter((a) => a.institutionId === this.institutionId);
  }

  async asset(id: string): Promise<Asset | null> {
    const found = await this.inner.asset(id);
    return found?.institutionId === this.institutionId ? found : null;
  }

  async createAsset(asset: Asset): Promise<Asset> {
    if (asset.institutionId !== this.institutionId) {
      throw new OutsideInstitution('add an asset to', asset.institutionId);
    }
    return this.inner.createAsset(asset);
  }

  async updateAsset(id: string, change: (current: Asset) => Asset): Promise<Asset> {
    const found = await this.inner.asset(id);
    // Indistinguishable from one that does not exist, deliberately.
    if (!found || found.institutionId !== this.institutionId) throw new NotFound('asset', id);

    return this.inner.updateAsset(id, (current) => {
      const next = change(current);
      if (next.institutionId !== current.institutionId) {
        throw new OutsideInstitution('move an asset to', next.institutionId);
      }
      return next;
    });
  }

  // ── recorded calculations ───────────────────────────────────────────────
  //
  // Scoped through the board, like an incident. A recorded computation carries
  // the figures an institution supplied, which makes leaking one across a
  // tenant boundary worse than leaking a ruling: a ruling is reasoning, and
  // this is a balance sheet.

  async computations(filter: { boardId?: string; kind?: string; assetId?: string } = {}): Promise<Computation[]> {
    if (filter.boardId && !(await this.owns(filter.boardId))) return [];
    const mine = await this.ownBoardIds();
    const all = await this.inner.computations(filter);
    return all.filter((c) => mine.has(c.boardId));
  }

  async computation(id: string): Promise<Computation | null> {
    const found = await this.inner.computation(id);
    if (!found) return null;
    return (await this.owns(found.boardId)) ? found : null;
  }

  async recordComputation(computation: Computation): Promise<Computation> {
    if (!(await this.owns(computation.boardId))) {
      throw new OutsideInstitution('record a calculation for', computation.boardId);
    }
    return this.inner.recordComputation(computation);
  }

  async withdrawComputation(id: string, by: string, reason: string, at: string): Promise<Computation> {
    const found = await this.inner.computation(id);
    // Indistinguishable from one that does not exist, deliberately.
    if (!found || !(await this.owns(found.boardId))) throw new NotFound('computation', id);
    return this.inner.withdrawComputation(id, by, reason, at);
  }

  // ── briefings ───────────────────────────────────────────────────────────
  //
  // A briefing carries no board and no institution: it is a standing brief on
  // technological change, written once and read by every board. That is
  // correct while every installation reads the same protocol, and stops being
  // correct the moment a bank wants its own. Recorded in the architecture as
  // open rather than half-solved here.

  briefings(): Promise<Briefing[]> {
    return this.inner.briefings();
  }

  briefing(id: string): Promise<Briefing | null> {
    return this.inner.briefing(id);
  }

  // ── the assistant log ───────────────────────────────────────────────────

  async appendAssistantExchange(exchange: AssistantExchange): Promise<void> {
    // Stamped on the way in, so it can be scoped on the way out.
    return this.inner.appendAssistantExchange({
      ...exchange,
      institutionId: this.institutionId,
    });
  }

  /**
   * Entries carry an institution because they carry a member's question, which
   * is deliberation-adjacent text and among the most sensitive this holds.
   *
   * Entries written before the field existed carry none. They are returned only
   * where the store holds exactly one institution, because then there is
   * nothing they could ambiguously belong to. Anywhere else they are withheld:
   * an entry that cannot say whose it is must not be shown to someone who might
   * not be its owner.
   */
  async assistantLog(limit?: number): Promise<AssistantExchange[]> {
    const [log, all] = await Promise.all([
      this.inner.assistantLog(limit),
      this.inner.institutions(),
    ]);
    const unattributedIsUnambiguous = all.length <= 1;

    return log.filter((e) =>
      e.institutionId === undefined ? unattributedIsUnambiguous : e.institutionId === this.institutionId,
    );
  }

  close(): Promise<void> {
    return this.inner.close();
  }
}

/**
 * A write aimed outside the institution. Loud, because silently dropping it
 * would leave the caller believing it happened.
 */
export class OutsideInstitution extends Error {
  readonly code = 'outside_institution';
  constructor(what: string, boardId: string) {
    super(
      `Refusing to ${what} board ${boardId}: it belongs to another institution. ` +
        'This is a fault in the caller rather than a permission a member could be granted.',
    );
    this.name = 'OutsideInstitution';
  }
}
