import type { PassageKind } from './passage-shape.js';

/**
 * A member saying they will come back to something on a named day.
 *
 * ── what this is not ──────────────────────────────────────────────────────
 *
 * It is not a snooze. The obvious shape — *remind me on Tuesday*, hidden from
 * everybody else — was put to the board's owner and refused in that shape: in
 * a record whose whole rule is that what is written is the board's and is
 * permanent, a member could otherwise push something out of sight and nobody
 * would know it had been pushed. The first private entry in the application
 * would have been the one that decides what the board does not look at.
 *
 * So it is a position, like every other position here. **Somebody put this
 * off, until this day, for this reason, and the board can read all three.** It
 * moves the row off the top of that member's own list and off nobody else's.
 *
 * ── and it changes nothing about what is waiting ──────────────────────────
 *
 * The count of what is waiting, the days it has stood there and whether a
 * clock has run out are all exactly what they were. A member who puts off
 * something already overdue has put off something already overdue, and the
 * record says so — an arrangement where setting a thing aside also quieted the
 * figure would be a way to make the board's own pace measure lie.
 *
 * ── append-only, like everything ──────────────────────────────────────────
 *
 * Coming back to something early is a second entry, not the deletion of the
 * first. Why a member set something aside and then picked it up the same
 * afternoon is as much a part of the record as the setting aside.
 */

export interface PutOff {
  id: string;
  boardId: string;
  /** What was put off. The same pair an assignment names. */
  ofKind: PassageKind;
  ofId: string;
  /**
   * The day the member said they would come back to it.
   *
   * Null is taking it back: the member picked it up again before the day came,
   * and the entry saying so stands over the one that set it aside.
   */
  until: string | null;
  /**
   * Why. Compulsory when setting something aside, and the reason this is a
   * record rather than a snooze: the board reads it.
   */
  reason: string;
  by: string;
  at: string;
}

/** A reason nobody wrote is a member pressing a button. */
export const MIN_REASON = 10;

export type PutOffRefusal =
  | 'no_reason'
  | 'day_has_passed'
  | 'nothing_to_take_back';

export class Refused extends Error {
  constructor(
    readonly reason: PutOffRefusal,
    message: string,
  ) {
    super(message);
    this.name = 'Refused';
  }
}

export interface PutOffInput {
  id: string;
  boardId: string;
  ofKind: PassageKind;
  ofId: string;
  until: string | null;
  reason: string;
  by: string;
  at: string;
}

export function putOff(input: PutOffInput): PutOff {
  const reason = input.reason.trim();

  if (input.until === null) {
    return { ...input, until: null, reason };
  }

  if (reason.length < MIN_REASON) {
    throw new Refused(
      'no_reason',
      `Say why, in at least ${MIN_REASON} characters. The board reads this: a row set aside with ` +
        'no reason tells them something was put off and nothing about why.',
    );
  }

  /*
   * A day that has already gone is not a day to come back on. Refused rather
   * than quietly corrected: a member who typed last month meant something, and
   * this has no way of knowing what.
   */
  if (Date.parse(input.until) <= Date.parse(input.at)) {
    throw new Refused(
      'day_has_passed',
      'That day has already passed. Setting something aside until yesterday leaves it exactly ' +
        'where it was.',
    );
  }

  return { ...input, reason };
}

/**
 * What stands, per member and per thing: the last entry that member wrote.
 *
 * Derived rather than stored, like every other standing in this record. A
 * store that kept only the current one could not answer *who set this aside,
 * and how many times*, which is the question a chair asks about a row that
 * has not moved in two months.
 */
export function standingPutOffs(all: readonly PutOff[]): PutOff[] {
  const last = new Map<string, PutOff>();
  for (const p of all) last.set(`${p.ofKind}:${p.ofId}:${p.by}`, p);
  return [...last.values()].filter((p) => p.until !== null);
}

/** Those still to come. One whose day has arrived is back on the list by itself. */
export function setAsideNow(all: readonly PutOff[], now: string): PutOff[] {
  return standingPutOffs(all).filter((p) => Date.parse(p.until!) > Date.parse(now));
}

/** Every standing set-aside on one thing, whoever wrote it. */
export function onThis(
  all: readonly PutOff[],
  ofKind: PassageKind,
  ofId: string,
  now: string,
): PutOff[] {
  return setAsideNow(all, now).filter((p) => p.ofKind === ofKind && p.ofId === ofId);
}

/**
 * Taking it back needs something to take back.
 *
 * Refused rather than written as a no-op, so a member who presses it twice is
 * told the second press did nothing rather than adding an entry saying they
 * picked up something they were not holding.
 */
export function takingBack(all: readonly PutOff[], ofKind: PassageKind, ofId: string, by: string): void {
  const standing = standingPutOffs(all).some(
    (p) => p.ofKind === ofKind && p.ofId === ofId && p.by === by,
  );
  if (!standing) {
    throw new Refused('nothing_to_take_back', 'You have not set this aside.');
  }
}
