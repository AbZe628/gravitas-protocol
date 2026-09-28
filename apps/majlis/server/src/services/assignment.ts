import type { PassageKind, Passage, Step } from './passage-shape.js';
import type { Role } from '../auth/members.js';

/**
 * Who is actually doing a thing, as opposed to whose kind of thing it is.
 *
 * ── the gap this fills ────────────────────────────────────────────────────
 *
 * Every step in this application belongs to a **role**: the board, a
 * signatory, the institution, a clock. That is true and useful — the
 * commonest way anything stalls is that each side believes it is with the
 * other — but it is not how a board actually works.
 *
 * A chair reads a question and gives it to the member who knows that market.
 * A member takes something because they have the afternoon. Somebody going
 * away hands theirs on. None of that could be recorded, so:
 *
 *   - the screen called **what needs you** had to *guess* what was yours from
 *     your role, which meant every board step was everybody's and the list was
 *     the same list for all five members;
 *   - the first thing a chair does on receiving work — giving it to somebody —
 *     was the one thing the application had no way to express;
 *   - and a matter nobody had picked up looked exactly like a matter somebody
 *     was already preparing.
 *
 * ── it is a record, not a field ───────────────────────────────────────────
 *
 * Assignments are appended and never edited. What stands for a step is the
 * last entry written about it, and handing something on leaves both the giving
 * and the taking in the record. That matters: *who was this with while it sat
 * for forty days* is a question a board will ask, and a field that only ever
 * held the current holder could not answer it.
 *
 * Releasing is written as an assignment to nobody rather than by deleting the
 * previous one, for the same reason.
 *
 * ── what it does not do ───────────────────────────────────────────────────
 *
 * It never makes somebody responsible who did not agree to be. A chair may
 * *give* work — that is what a chair is — but the record says who gave it and
 * when, so an assignment nobody accepted reads as exactly that rather than as
 * a commitment.
 *
 * And it decides nothing about the work. Whether a step is open, what it is,
 * and whose kind of act it is all stay with the readings. This only says which
 * person, of the people who could, is the one doing it.
 */

export interface Assignment {
  id: string;
  boardId: string;
  /** The thing it is on. */
  ofKind: PassageKind;
  ofId: string;
  /**
   * The step, or null for the whole thing.
   *
   * Both are real. *Prepare this matter* is the chair's ordinary act and does
   * not name a step; *you answer the third condition* does. A holder of the
   * whole thing holds whatever step is next, and a step's own holder wins over
   * them — the specific beats the general, which is how a chair hands one
   * piece of something to somebody else without taking the rest away.
   */
  stepKey: string | null;
  /** Whom it is with. Null where it was handed back to the room. */
  to: string | null;
  /** Who said so. Never inferred from the request. */
  by: string;
  at: string;
  /** Why, where whoever wrote it said. */
  note?: string;
}

/** How the record came to be, which the screen says in its own words. */
export type HowAssigned = 'given' | 'taken' | 'handed_on' | 'released';

/**
 * How this assignment happened, read from the record rather than stored.
 *
 * Stored it would be a second thing to keep true. Whether somebody took work
 * or was given it is entirely decided by whether the person who wrote the
 * record is the person named in it.
 */
export function howOf(a: Assignment, previous: Assignment | null): HowAssigned {
  if (a.to === null) return 'released';
  if (a.to === a.by) return 'taken';
  if (previous?.to && previous.to !== a.to) return 'handed_on';
  return 'given';
}

/**
 * Whether a step is still to be done.
 */
const ahead = (step: Pick<Step, 'state'>): boolean => step.state === 'open' || step.state === 'ahead';

/**
 * Whether a step can carry one person's name.
 *
 * **The board's own steps, and only those.** They are work one member does on
 * the board's behalf — answering the conditions, drawing up the reasons — and
 * *who is doing it* is a real question with one answer.
 *
 * Not a signatory's. Voting, concurring, determining are each signatory's own
 * act: every one of them does it for themselves, and nobody does it for the
 * rest. A name on such a step says it is that person's, and the screen that
 * asks what needs you reads it that way — so the first version of this, which
 * named signatory steps, took the vote off every other signatory's list the
 * moment one of them took the matter on. Whoever carries it is on the passage
 * as its `holder`; the step stays every signatory's.
 *
 * Not the institution's or its liaison's — those are the other side of the
 * table, and this board naming who does them would be minuting a commitment
 * the bank never made. Not the clock's or the software's, which nobody does.
 */
export function placeable(step: Pick<Step, 'whose' | 'state'>): boolean {
  return step.whose === 'board' && ahead(step);
}

/**
 * Whether a step is one a person on this board might carry the thing towards:
 * the board's or a signatory's, still to be done.
 *
 * Wider than `placeable`. A breach has no step of the board's own — every step
 * on this side of it is the signatories' — and it is still something one
 * member takes on and carries to a finding.
 */
export function onOurSide(step: Pick<Step, 'whose' | 'state'>): boolean {
  return (step.whose === 'board' || step.whose === 'signatory') && ahead(step);
}

/**
 * The assignment that stands for one step, or null where nobody holds it.
 *
 * Later entries supersede earlier ones for the same step, and an entry naming
 * nobody means the step went back to the room.
 *
 * A step with no entry of its own falls back to whoever holds the whole thing
 * — **but only a step of the board's own**, for the reason `placeable` gives.
 * The holder of a matter does not hold the institution's filing: a member who
 * took a matter on was listed as the one holding up the bank's plan, which is
 * the wrong person in the column that says who is holding it up — the same
 * fault the undertaking row once had. Nor the vote, which is every
 * signatory's.
 *
 * Pass null for the step to ask who holds the whole thing.
 */
export function heldBy(
  assignments: readonly Assignment[],
  ofKind: PassageKind,
  ofId: string,
  step: Pick<Step, 'key' | 'whose'> | null,
): Assignment | null {
  let onStep: Assignment | null = null;
  let onWhole: Assignment | null = null;

  for (const a of assignments) {
    if (a.ofKind !== ofKind || a.ofId !== ofId) continue;
    if (a.stepKey === null) onWhole = a;
    else if (step && a.stepKey === step.key) onStep = a;
  }

  // The specific beats the general, including where the specific released it:
  // a step handed back to the room is back with the room, not back with
  // whoever holds the rest.
  const standing =
    step === null ? onWhole : (onStep ?? (step.whose === 'board' ? onWhole : null));
  return standing && standing.to !== null ? standing : null;
}

/**
 * The same passage, with the people who hold its steps written on it.
 *
 * Applied after a reading rather than inside one, so the readings stay about
 * the record and know nothing about who picked what up. Every route that
 * serves a passage runs it through here; a route that forgets shows a passage
 * where nobody holds anything, which is what they all did before.
 *
 * Only on steps still to be done. A name on a finished step would read as
 * *this person did it*, and an assignment says who was asked, not who acted —
 * the record of who acted is the act itself.
 */
export function withAssignments(p: Passage, assignments: readonly Assignment[]): Passage {
  const name = (s: Step): Step => {
    // A name already on the step wins: an undertaking names the person who
    // gave it, and no assignment moves who made a promise.
    if (s.who || !placeable(s)) return s;
    const held = heldBy(assignments, p.of.kind, p.of.id, s);
    if (!held?.to) return s;
    return { ...s, who: held.to };
  };

  const groups = p.groups.map((g) => ({ ...g, steps: g.steps.map(name) }));
  const next = p.next ? name(p.next) : null;
  const whole = heldBy(assignments, p.of.kind, p.of.id, null);
  const holder = whole?.to ? { to: whole.to, by: whole.by, at: whole.at } : null;

  const holdable = p.groups.some((g) => g.steps.some(onOurSide));

  return { ...p, groups, next, holder, holdable };
}

/** Whose desk anything on this board is currently on, for one person. */
export function heldByAnyone(
  assignments: readonly Assignment[],
  ofKind: PassageKind,
  ofId: string,
): Assignment[] {
  const standing = new Map<string, Assignment>();
  for (const a of assignments) {
    if (a.ofKind !== ofKind || a.ofId !== ofId) continue;
    standing.set(a.stepKey ?? '', a);
  }
  return [...standing.values()].filter((a) => a.to !== null);
}

/**
 * Why an assignment was refused, in the words the route sends back.
 *
 * Named cases rather than a boolean, because *no* is not an answer a board
 * member can act on. Every one of these says which act would have worked.
 */
export type Refusal =
  | 'not_on_this_board'
  | 'held_by_somebody_else'
  | 'not_yours_to_hand_on'
  | 'not_a_member';

/**
 * Whether this person may write this assignment, and why not.
 *
 * ── the rule, and why it is this one ──────────────────────────────────────
 *
 * **The chair and the secretary may place anything with anybody.** That is
 * what a chair is: the first thing one does on receiving work is decide who
 * looks at it. The record says who gave it, so work nobody agreed to take
 * reads as exactly that.
 *
 * **Anybody may take work nobody holds.** A member with an afternoon free
 * should not have to ask permission to start.
 *
 * **Only the holder hands their own on, or puts it back.** Taking something
 * out of a colleague's hands is not a thing software should let one member do
 * to another quietly; they ask, or the chair moves it. This is the one refusal
 * here that is about manners rather than authority, and it is deliberate.
 *
 * Nothing in this is a security boundary. The route refuses on the same rule
 * and that is what actually holds; this exists so a screen can stop offering
 * what would be refused.
 */
export function mayAssign(input: {
  /** Who is writing it. */
  by: string;
  /** Their office, where they hold one. */
  office: 'chair' | 'secretary' | null;
  /** Whether they are on this board at all. */
  onTheBoard: boolean;
  /** Whom it is being placed with, or null to put it back. */
  to: string | null;
  /** Who holds it now, where anybody does. */
  heldBy: string | null;
}): Refusal | null {
  if (!input.onTheBoard) return 'not_a_member';

  // The chair and the secretary may move anything, including out of somebody
  // else's hands. That is the escalation path the refusal below assumes.
  if (input.office === 'chair' || input.office === 'secretary') return null;

  if (input.heldBy === null) {
    // Free. Anybody may take it, and anybody may hand it to a colleague —
    // passing on something nobody had is not taking anything away.
    return null;
  }

  if (input.heldBy !== input.by) return 'held_by_somebody_else';

  // Their own: they may hand it on or put it back.
  return null;
}

/**
 * The assignments a reader may see: all of them, or none.
 *
 * **None for the institution.** Who on the board is carrying the bank's own
 * question is the board's business and not the bank's. A desk that knew which
 * scholar held its question would know whom to lobby, and a board whose
 * members can be approached one at a time about work in their hands is not
 * independent in the way the bank is paying for.
 *
 * It was all of them, for everybody: the passage routes, the queue and the
 * assignment record itself answered a bank desk with the name of the member
 * holding each thing — found by asking them with a desk's credential, after
 * every test had passed. One rule, applied wherever assignments are applied,
 * so no route can be the one that forgot.
 */
export function visibleTo(role: Role | undefined, assignments: readonly Assignment[]): readonly Assignment[] {
  return role === 'institution' ? [] : assignments;
}
