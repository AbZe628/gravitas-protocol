/**
 * How this board refers to its own rulings.
 *
 * ── what a reference is for ───────────────────────────────────────────────
 *
 * A ruling leaves the building. It is filed by the bank, cited in a
 * prospectus, handed to a regulator and quoted back years later. What it was
 * referred to by until now was the internal matter id — `matter-2026-04-02` —
 * which is a database key wearing a suit. Boards have their own series, and a
 * regulator asking for *SSB/2026/014* should be able to be handed it.
 *
 * ── assigned once, when it comes into force ───────────────────────────────
 *
 * Not when the matter opens: most matters never become rulings, and burning a
 * number on every question would leave a series full of gaps that look like
 * missing decisions. Not on demand either, because a reference that changed
 * would be a reference the bank already filed under something else.
 *
 * So it is taken at the moment the ruling takes effect and never moves. A
 * matter that reaches force before a board has set a series keeps its id, and
 * setting one later does not go back and renumber — a ruling that changed its
 * own reference is worse than one that never had a pretty number.
 *
 * ── the pattern is the board's ────────────────────────────────────────────
 *
 * `{year}` and `{n}` are the only placeholders. Anything else in the pattern
 * is the board's own text and is copied out as written: a board that writes
 * `SSB/{year}/{n}` gets `SSB/2026/14`, and one that writes `{year}-{n}` gets
 * `2026-14`. Inventing further placeholders would mean guessing at what a
 * board means, which is what this application is built not to do.
 *
 * ── and the counter is per year, per board ────────────────────────────────
 *
 * Read off the references already assigned rather than kept as a number
 * somewhere, so the series cannot drift from the record. A ruling withdrawn
 * later keeps its number, and the next one takes the one after: a series with
 * a hole in it is the truth about what happened, and renumbering to close the
 * hole would make two documents share a reference.
 */

import type { Matter } from '../types.js';

const YEAR = /\{year\}/g;
const N = /\{n\}/g;

/**
 * Whether a pattern can produce a reference at all.
 *
 * Asked with `includes` rather than with the regex above: a regex carrying /g
 * remembers where it stopped, so `N.test` on the same pattern answers true and
 * then false, and the board's second ruling of the day would quietly lose its
 * number.
 */
export function usable(pattern: string | undefined): pattern is string {
  return Boolean(pattern && pattern.includes('{n}'));
}

/**
 * The next reference for this board, in this year.
 *
 * `existing` is every matter the board holds. Single-process: two rulings
 * coming into force in the very same instant on a multi-process deployment
 * could read the same count. That is the same assumption the rest of this
 * application already makes, and it is written down rather than pretended
 * away.
 */
export function nextReference(
  pattern: string,
  existing: readonly Matter[],
  at: string,
): string {
  const year = at.slice(0, 4);
  const prefix = pattern.replace(YEAR, year);

  /*
   * What the pattern looks like with a number in it, so the ones already
   * assigned can be recognised. Everything that is not the placeholder is the
   * board's own text and is matched literally.
   */
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{n\\\}/g, '(\\d+)');
  const shape = new RegExp(`^${escaped}$`);

  let highest = 0;
  for (const matter of existing) {
    const found = matter.reference?.match(shape);
    if (found) highest = Math.max(highest, Number(found[1]));
  }

  return prefix.replace(N, String(highest + 1));
}

/**
 * Give a matter its reference, if it is due one and does not have one.
 *
 * Returns the matter unchanged where the board has set no series, where the
 * matter already carries a reference, or where the pattern could not produce
 * one. Every one of those is an ordinary state: a board without a series is
 * not misconfigured, it simply refers to its rulings by their id.
 */
export function giveItAReference(
  matter: Matter,
  pattern: string | undefined,
  existing: readonly Matter[],
  at: string,
): Matter {
  if (matter.reference) return matter;
  if (!usable(pattern)) return matter;

  return { ...matter, reference: nextReference(pattern, existing, at) };
}
