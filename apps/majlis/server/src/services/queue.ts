import type { Board, Incident, Matter, Rule, Structure, Submission } from '../types.js';
import { standingOf } from './submission.js';
import { buildPassage, say, type Say, type Whose } from './passage.js';
import type { Passage } from './passage-shape.js';
import { buildIncidentPassage } from './passage-incident.js';
import { withAssignments, type Assignment } from './assignment.js';
import { buildQuestionPassage } from './passage-question.js';
import { buildReviewPassage } from './passage-review.js';
import { buildUndertakingPassage } from './passage-undertaking.js';

/**
 * The next act on one thing, or nothing where the reading cannot be made.
 *
 * Every kind is wrapped the same way and for the same reason: this is the
 * screen a member opens first, and one malformed record must not take every
 * other row down with it. The row survives without its sentence — it still
 * says what the thing is and how long it has waited, which is enough to find
 * it and open it, and the page it opens says what is wrong in its own words.
 */
/**
 * What a row takes from its passage, named off the row itself.
 *
 * Written out by hand, it was a second list of the same fields: adding
 * `holdable` to the row left this one behind and the field never arrived.
 * Taken off `QueueRow`, a field added there has to be filled here or the
 * compiler says so.
 */
type FromPassage = Pick<QueueRow, 'next' | 'whose' | 'who' | 'holder' | 'heard' | 'holdable'>;

function nextOn(read: () => Passage): FromPassage {
  try {
    return fromPassage(read());
  } catch {
    return { next: null, whose: null };
  }
}

/** What a row carries from its passage — one place, so no kind can drop a field. */
function fromPassage(p: Passage): FromPassage {
  return {
    next: p.next?.act ?? null,
    whose: p.next?.whose ?? null,
    who: p.next?.who,
    holder: p.holder?.to ?? undefined,
    heard: p.next?.heard,
    holdable: p.holdable,
  };
}
import { reviewStatus } from './review.js';
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
  next: Say | null;
  /** Whose that act is. Null only where there is no act. */
  whose: Whose | null;
  /**
   * The person the next step is with, where anybody holds it.
   *
   * Read off the passage's own next step, for every kind — the undertaking's
   * giver, or whoever the step was placed with. Taken from anywhere else it
   * can name somebody other than the step's own holder, which is how the
   * undertaking row once named the wrong member. Absent where nobody has the
   * step; never invented from the role.
   */
  who?: string;
  /**
   * Who is carrying the whole of it, where anybody is.
   *
   * Not the same as `who`. A matter at the vote is every signatory's step
   * — nobody's name goes on it — and it is still being carried by the member
   * who took it on, whose list it belongs on.
   */
  holder?: string;
  /**
   * Who has already said theirs on the next step, where each of several says
   * theirs — off the passage, as `who` is. A cast vote is not the voter's work
   * any more, however long the vote stays open for the others.
   */
  heard?: string[];
  /**
   * Whether anybody on this board could carry this at all.
   *
   * The passage has said so since it was written and the row never carried it,
   * so the queue could not offer *take it on* without guessing — and guessing
   * would have put the control on every breach waiting on the bank's own
   * filing, where the route refuses it. A control that cannot be honoured is
   * absent, not disabled, and this is the field that says which.
   */
  holdable?: boolean;
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

export interface QueueInput {
  board: Board;
  submissions: readonly Submission[];
  matters: readonly Matter[];
  rules: readonly Rule[];
  incidents: readonly Incident[];
  undertakings: readonly Undertaking[];
  /**
   * The shapes, so a matter's own one can be found.
   *
   * This row used to build the passage with no shape at all, on the reasoning
   * that the shape only affects the shaping steps and the row shows the next
   * act, which was the same either way. That stopped being true the moment the
   * spine learned that the vote waits on the conditions: with no shape the
   * conditions read as *not applicable*, nothing was in the way, and this
   * screen told a signatory to open a vote while the matter's own screen told
   * them to answer six conditions. The same function, the same matter, two
   * sentences — which is the fault this file's own preamble is about.
   */
  structures: readonly Structure[];
  /**
   * Who is actually doing what, so the row can name a person.
   *
   * Passed in rather than read here: this file decides ordering and nothing
   * else, and a second place that read the assignment record would be a second
   * place that could disagree with the passages about who holds a step.
   */
  assignments: readonly Assignment[];
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
      /*
       * The one it names, not only the list it is on — as the undertakings'
       * rows do. The list opens on it, which is where taking it up is offered.
       */
      to: `/questions/${s.id}`,
      title: s.subject,
      phase: 'asked',
      ...nextOn(() => withAssignments(buildQuestionPassage(s, now), input.assignments)),
      days: daysSince(s.arrivedAt, now),
      overdue: false,
    });
  }

  // ── deciding ────────────────────────────────────────────────────────────
  for (const m of input.matters) {
    if (SETTLED.includes(m.status)) continue;

    /*
     * The same function the matter's own screen uses, with the same shape, so
     * the sentence a member reads in the queue is the sentence they read when
     * they open it. Both halves of that matter: the function alone was not
     * enough, because it answers differently depending on what it is given.
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
    let read: ReturnType<typeof fromPassage> = { next: null, whose: null };
    let days = daysSince(m.openedAt, now);
    try {
      const shape = m.structureId
        ? (input.structures.find((s) => s.id === m.structureId) ?? null)
        : null;
      const passage = withAssignments(buildPassage(board, m, shape, now), input.assignments);
      read = fromPassage(passage);
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
      ...read,
      days,
      overdue: false,
    });
  }

  for (const u of input.undertakings) {
    if (u.state !== 'open') continue;
    rows.push({
      kind: 'undertaking',
      id: u.id,
      /*
       * The one it names, not the list it is on.
       *
       * An undertaking has no address of its own, so this row sent a member
       * to a list of them with the act — say what happened, and close it —
       * written on the row they had just left. The list finds the one named
       * here and opens on it. It is still the list, which is right: what
       * else was undertaken at that sitting is the context for closing this.
       */
      to: `/undertakings/${u.id}`,
      title: u.what,
      phase: 'deciding',
      /*
       * The person, by name — but only where the step is theirs.
       *
       * An undertaking belongs to whoever gave it, and a row saying only *the
       * board* would be handing it back to the room it was taken out of, which
       * is how undertakings are lost. So the name was taken from the record
       * and put on every row.
       *
       * That was wrong the moment the reading could say a different act was
       * next. An undertaking with no date is waiting on **the board** to set
       * one, and the row named the member who gave it — the wrong person, in
       * the column that says who is holding it up, on the screen everybody
       * opens first. Found by reading the list rather than by any test.
       */
      ...nextOn(() => withAssignments(buildUndertakingPassage(u, now), input.assignments)),
      days: daysSince(u.minutedAt, now),
      overdue: undertakingOverdue(u, now),
    });
  }

  // ── in force ────────────────────────────────────────────────────────────
  /*
   * Every ruling with something outstanding, not only the ones whose date has
   * come.
   *
   * This walked the reviews that were **due** and skipped the rest, which
   * quietly excluded the worst case in the whole register: a ruling with no
   * review interval at all. reviewStatus names it — nothing will bring this
   * back before the board — and because such a ruling can never become due, it
   * could never appear here. The ruling least likely to be looked at again was
   * the one this screen was surest to leave out.
   *
   * The reading decides now. A ruling with an interval and a date still ahead
   * has no open step and produces no row; one with no interval has an open
   * step belonging to the board, and so does one whose date has arrived.
   */
  for (const rule of input.rules) {
    const read = nextOn(() => withAssignments(buildReviewPassage(rule, now), input.assignments));
    if (!read.next) continue;

    const status = reviewStatus(rule, now);
    rows.push({
      kind: 'review',
      id: rule.id,
      /*
       * The ruling itself. This sent a member to the list of every ruling in
       * force with the act — look at it again — written on the row they had
       * just left; the ruling's own page is where that act and taking it on
       * both are.
       */
      to: `/rules/${rule.id}`,
      title: rule.title,
      phase: 'inforce',
      ...read,
      /*
       * Days past the date where there is one. A ruling with no interval is
       * not late — nothing was ever promised — so it waits at zero and takes
       * its place by kind rather than by a number this file invented.
       */
      days: status.daysUntilDue === null ? 0 : Math.max(0, -status.daysUntilDue),
      overdue: status.overdue,
    });
  }

  // ── checked ─────────────────────────────────────────────────────────────
  for (const i of input.incidents) {
    /*
     * The same reading the breach's own screen uses.
     *
     * This was a hand table here of six stages mapped to acts and owners — a
     * third copy of the grammar, and the shortest of the three. It knew
     * nothing of two steps the breach screen knew about: that the activity has
     * to stop, and that purification has to be paid. So a breach could sit in
     * this list saying *close it once purification is recorded* while the
     * breach's own screen was waiting on the bank to pay, and a breach whose
     * activity had never stopped read here as ordinary progress.
     *
     * Wrapped for the same reason the matter above is: this is the arrival
     * screen, and one malformed record must not take every other row with it.
     */
    let read: ReturnType<typeof fromPassage> = { next: null, whose: null };
    try {
      read = fromPassage(withAssignments(buildIncidentPassage(i, now), input.assignments));
    } catch {
      // Left as it stands: the row without its next act.
    }

    // Settled either way — dismissed or closed — is not waiting on anybody.
    if (i.stage === 'not_actual' || i.stage === 'closed') continue;

    rows.push({
      kind: 'breach',
      id: i.id,
      to: `/incidents/${i.id}`,
      title: i.title,
      phase: 'checked',
      ...read,
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
