import { placeableMembers } from './members.js';
import type { SeatedMember } from './api.js';
import type { Identity } from './identity.js';

/**
 * Who may move a piece of work, read once.
 *
 * The rule is the server's — `services/assignment.ts`, `mayAssign` — and a
 * screen only stops offering what would be refused:
 *
 *   - **nobody holds it**: take it, or place it with a colleague;
 *   - **you hold it**: hand it on, or put it back to the board;
 *   - **a colleague holds it**: nothing to press. Taking work out of a
 *     colleague's hands is not something one member does to another quietly;
 *   - **chair or secretary**: place it with anybody, and put it back, whoever
 *     holds it. That is what the office is.
 *
 * ── why it is a function and not two copies ───────────────────────────────
 *
 * The panel beside a piece of work had this written into it, and the queue now
 * offers the same acts on the row. Written twice, the row and the panel could
 * disagree about whether a member may take something — the fault this
 * application spends most of its shape avoiding, and the one the queue itself
 * was built to end (*the sentence a member reads in the queue is the sentence
 * they read when they open it*).
 *
 * `null` where there is nothing to hold. A control that cannot be honoured is
 * absent, not disabled.
 */
export interface Holding {
  /** Whoever carries it now, as a scholar id. Null where nobody does. */
  holder: string | null;
  /** This member carries it. */
  mine: boolean;
  /** Nobody carries it. */
  free: boolean;
  /** Whether this member may move it at all. */
  mayMove: boolean;
  /** Who it could be placed with — never whoever already holds it. */
  colleagues: SeatedMember[];
  /** Whether this member holds an office, which is what widens the rule. */
  office: boolean;
  /**
   * Whether this member sits on this board at all.
   *
   * Apart from `mayMove`: a member who sits and may not move it is told whom
   * to ask, and one who does not sit is told nothing, because it was never
   * theirs to move.
   */
  sits: boolean;
  /** This member's own id, where they have one. */
  me: string | null;
}

export function holdingOf({
  holdable,
  holder,
  identity,
  members,
}: {
  /** The passage's or step's own answer to *could anybody here carry this*. */
  holdable: boolean | undefined;
  holder: string | null | undefined;
  identity: Identity | null | undefined;
  members: readonly SeatedMember[] | null;
}): Holding | null {
  if (!holdable) return null;

  const me = identity?.scholarId ?? null;
  /*
   * On this board, and on this side of the table. Both lists, because neither
   * is enough: the board's list carries the institution's liaison as a member,
   * and the credential says what each person is.
   */
  const sits =
    me !== null &&
    (identity?.role === 'signatory' || identity?.role === 'advisory') &&
    (members ?? []).some((m) => m.scholarId === me);
  const office = identity?.office === 'chair' || identity?.office === 'secretary';

  const now = holder ?? null;
  const mine = now !== null && now === me;
  const free = now === null;

  return {
    holder: now,
    mine,
    free,
    mayMove: sits && (office || free || mine),
    colleagues: placeableMembers(members).filter((m) => m.scholarId !== now),
    office,
    sits,
    me,
  };
}
