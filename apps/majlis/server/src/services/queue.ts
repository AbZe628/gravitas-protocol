import type { Board, Incident, Matter, Rule, Submission } from '../types.js';
import { standingOf } from './submission.js';
import { buildPassage, type Whose } from './passage.js';
import { reviewsDue } from './review.js';
import { overdue as undertakingOverdue, type Undertaking } from './undertaking.js';

/**
 * Everything that is waiting on somebody, in one list.
 *
 * ── why this exists ───────────────────────────────────────────────────────
 *
 * The application was organised by noun. Questions on one screen, matters on
 * another, breaches on a third, sittings on a fourth — twenty-five screens,
 * no two of them the same shape, each a list under a title. A member arriving
 * had to know which cupboard to open before they could find out whether
 * anything was waiting for them.
 *
 * That is the organisation of a shared drive, carried into software. A
 * scholar does not think *I will go and look at the sittings now*. They think
 * **what needs me** — and the answer to that crosses every one of those
 * screens at once.
 *
 * So this assembles the board's whole world into rows of one shape. What it
 * is, which stage it stands in, the one act to do next, whose that act is,
 * and how long it has stood there.
 *
 * ── it computes nothing of its own ────────────────────────────────────────
 *
 * Every judgement here already existed somewhere and is called rather than
 * repeated. `buildPassage` says what is next on a matter and whose it is;
 * `reviewsDue` says which rulings have come round; `overdue` says whether an
 * undertaking has passed its date. This file decides ordering and nothing
 * else.
 *
 * That restraint is the point. The first sketch of this screen derived the
 * next act on the client from the record's status — a second place saying
 * what happens next, which would disagree with `passage.ts` the first time
 * either changed. The navigation in this application was once written out in
 * three places and they did disagree; that is not a mistake worth making
 * twice.
 *
 * ── the order is what is waiting, never what is grave ─────────────────────
 *
 * Overdue first, then oldest. Never by how serious a thing looks: ranking a
 * breach above a question because breaches sound worse would be the software
 * forming a view about a matter it has not read. What it is entitled to know
 * is how long something has waited and whether a clock has run out, and both
 * of those are facts.
 */

export type QueuePhase = 'asked' | 'deciding' | 'inforce' | 'checked';

export type QueueKind = 'question' | 'matter' | 'review' | 'breach' | 'undertaking';

export interface QueueRow {
  kind: QueueKind;
  id: string;
  /** Where this opens. The row is a link and nothing else. */
  to: string;
  /** What it is, in whatever words the record already carries. */
  title: string;
  phase: QueuePhase;
  /**
   * The one act to do next, in the words the interface shows, or null where
   * the thing is waiting on a clock rather than on a person.
   */
  next: string | null;
  /** Whose that act is. Null only where there is no act. */
  whose: Whose | null;
  /**
   * The person it belongs to, where the record names one.
   *
   * Only an undertaking does. Everything else is the board's, a signatory's
   * or the institution's as a body, and inventing a name for those would be
   * assigning work nobody agreed to take.
   */
  whoName?: string;
  /** How long it has stood here. Days, floored — never rounded up. */
  days: number;
  /** True where a clock has already run out. */
  overdue: boolean;
}

const DAY = 86_400_000;

/** Whole days since an instant, floored, never negative. */
function daysSince(iso: string, now: string): number {
  return Math.max(0, Math.floor((Date.parse(now) - Date.parse(iso)) / DAY));
}

/** A matter that is finished is not waiting on anybody. */
const SETTLED: readonly Matter['status'][] = ['in_force', 'withdrawn', 'rejected', 'lapsed'];

/**
 * What follows a reported breach, and whose it is.
 *
 * Three of the eight steps belong to the institution rather than to the
 * board, and saying so is most of the value of this row: the commonest way a
 * breach stalls is that each side believes it is with the other.
 */
const BREACH_NEXT: Record<Incident['stage'], { act: string; whose: Whose } | null> = {
  reported: { act: 'Determine whether it is an actual non-compliance', whose: 'board' },
  determined: { act: 'File a plan to put it right', whose: 'institution' },
  plan_filed: { act: 'Endorse the plan, or send it back', whose: 'board' },
  endorsed: { act: 'Put it to the Board of Directors', whose: 'institution' },
  approved: { act: 'File it with the regulator', whose: 'institution' },
  submitted: { act: 'Close it once purification is recorded', whose: 'board' },
  not_actual: null,
  closed: null,
};

export interface QueueInput {
  board: Board;
  submissions: readonly Submission[];
  matters: readonly Matter[];
  rules: readonly Rule[];
  incidents: readonly Incident[];
  undertakings: readonly Undertaking[];
  now: string;
}

export function buildQueue(input: QueueInput): QueueRow[] {
  const { board, now } = input;
  const rows: QueueRow[] = [];

  // ── asked ───────────────────────────────────────────────────────────────
  for (const s of input.submissions) {
    // Derived, not stored. The record holds dispositions; what stands is
    // the last of them, and the same function the routes use says so.
    if (standingOf(s) !== 'waiting') continue;
    rows.push({
      kind: 'question',
      id: s.id,
      to: '/questions',
      title: s.subject,
      phase: 'asked',
      next: 'Take it up as a matter, or say why not',
      whose: 'board',
      days: daysSince(s.arrivedAt, now),
      overdue: false,
    });
  }

  // ── deciding ────────────────────────────────────────────────────────────
  for (const m of input.matters) {
    if (SETTLED.includes(m.status)) continue;

    /*
     * The same function the matter's own screen uses, so the sentence a
     * member reads in the queue is the sentence they read when they open it.
     * A structure is not passed: the passage needs one only for the shaping
     * steps, and the row shows the next act, which is the same either way.
     *
     * ── and one bad record does not take the screen down ─────────────────
     *
     * `buildPassage` reads a dozen fields and assumes each is there. On the
     * matter's own page that is fine: one record, and a matter that cannot
     * be read is a matter nobody can open either way. Here it is not. This
     * is the arrival screen, and a single malformed record throwing would
     * mean a member signs in to nothing at all — every other question,
     * breach and undertaking lost with it.
     *
     * So the row survives without its sentence. It still says what the thing
     * is and how long it has waited, which is enough to find it and open it,
     * and the page it opens will say what is wrong in its own words.
     */
    let next: string | null = null;
    let whose: Whose | null = null;
    let days = daysSince(m.openedAt, now);
    try {
      const passage = buildPassage(board, m, null, now);
      next = passage.next?.act ?? null;
      whose = passage.next?.whose ?? null;
      days = passage.waiting?.days ?? days;
    } catch {
      // Left as it stands: the row without its next act.
    }

    rows.push({
      kind: 'matter',
      id: m.id,
      to: `/matters/${m.id}`,
      title: m.title,
      phase: 'deciding',
      next,
      whose,
      days,
      overdue: false,
    });
  }

  for (const u of input.undertakings) {
    if (u.state !== 'open') continue;
    rows.push({
      kind: 'undertaking',
      id: u.id,
      to: '/undertakings',
      title: u.what,
      phase: 'deciding',
      next: 'Say what happened, and close it',
      whose: 'board',
      /*
       * And the person, by name. An undertaking belongs to whoever gave it;
       * a row that said only "the board" would be handing it back to the room
       * it was taken out of, which is how undertakings are lost.
       */
      whoName: u.who,
      days: daysSince(u.minutedAt, now),
      overdue: undertakingOverdue(u, now),
    });
  }

  // ── in force ────────────────────────────────────────────────────────────
  for (const r of reviewsDue(input.rules as Rule[], now)) {
    // 'due' covers due-now and overdue; the distinction is carried by the
    // overdue flag, not by a second state.
    if (r.state !== 'due') continue;
    rows.push({
      kind: 'review',
      id: r.ruleId,
      to: '/rules',
      title: r.title,
      phase: 'inforce',
      next: 'Review it, and record what was found',
      whose: 'board',
      days: r.daysUntilDue === null ? 0 : Math.max(0, -r.daysUntilDue),
      overdue: r.overdue,
    });
  }

  // ── checked ─────────────────────────────────────────────────────────────
  for (const i of input.incidents) {
    const step = BREACH_NEXT[i.stage];
    if (!step) continue;
    rows.push({
      kind: 'breach',
      id: i.id,
      to: `/incidents/${i.id}`,
      title: i.title,
      phase: 'checked',
      next: step.act,
      whose: step.whose,
      days: daysSince(i.reportedAt, now),
      /*
       * The thirty days run from the board finding an event actual, not from
       * the report. An incident nobody has determined yet has no clock, and
       * showing one would be counting against the institution for days the
       * board has not yet used.
       */
      overdue: Boolean(i.determinedAt) && daysSince(i.determinedAt as string, now) > 30,
    });
  }

  /*
   * Overdue first, then longest-waiting. Within a tie, the order is whatever
   * the record gave, which is stable — an order that shuffled between loads
   * would make a member lose their place in the one list they read every day.
   */
  return rows.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return b.days - a.days;
  });
}
