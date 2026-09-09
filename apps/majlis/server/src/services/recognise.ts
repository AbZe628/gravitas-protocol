import type { Structure } from '../types.js';
import { readContract } from './reading-a-contract.js';

/**
 * Which kind of contract does this draft look like?
 *
 * ── the question this answers ─────────────────────────────────────────────
 *
 * A bank sends a question with a contract attached. The board's reader can
 * read a draft against **a named shape** — and somebody has to name it first,
 * from nineteen. A scholar who has not read the document yet cannot, and a
 * scholar who has read it did not need the reader.
 *
 * So the application reads the draft against all nineteen and says which ones
 * its own conditions turn up in. That is a thing a machine can do honestly:
 * it is counting words it can see, against conditions the board wrote.
 *
 * ── it suggests, and it does not decide ───────────────────────────────────
 *
 * The whole product refuses to conclude, and this is the place where the
 * temptation is strongest: *this is a murabaha* is exactly the verdict the
 * competing tools sell and exactly what a board is for. So what comes back is
 * a ranking with its working — how many of that shape's conditions were found
 * in the text, and which — and a scholar picks. A shape at the top of the list
 * is where the most matching words are, which is not the same as being right,
 * and the sentence saying so travels with the result.
 *
 * ── one matcher, not two ──────────────────────────────────────────────────
 *
 * It scores by running the real reader. A second, looser matcher written just
 * for recognition would sooner or later disagree with the reading a scholar
 * gets when they act on its suggestion, and they would have no way to tell
 * which of the two was lying.
 */

export interface ShapeGuess {
  structureId: string;
  name: string;
  /** Conditions whose words are squarely in the draft. */
  found: number;
  /** Conditions whose words are partly there. */
  partly: number;
  /** Conditions this shape has in total. */
  of: number;
  /** The requirements that turned up, so a reader can judge the guess. */
  matched: string[];
  /**
   * The shape's own name, in the draft's own words.
   *
   * A contract that calls itself a commodity murabaha is evidence about what
   * it is, and refusing to look at the title would be pedantry: the first run
   * of this put *Musawama* above *Murabaha* on a document headed COMMODITY
   * MURABAHA MASTER AGREEMENT, because musawama has four conditions and
   * matched three while murabaha has six and matched three.
   *
   * It is evidence and not proof — a document may name itself wrongly, and
   * saying so is the board's job — so it is shown as the reason rather than
   * folded silently into a score.
   */
  namedInTheDraft: string | null;
}

export interface Recognition {
  readAt: string;
  /** Best first. Only shapes with at least one condition found. */
  guesses: ShapeGuess[];
  /** Said on the screen, never in a footnote. */
  note: string;
}

/** Below this a shape is noise rather than a suggestion. */
const WORTH_OFFERING = 1;

/** More than this and it is a list to read rather than a choice to make. */
const MOST = 4;

/**
 * The words a shape is actually called, for looking in the draft's own text.
 *
 * Taken from the shape's name up to the first dash, which is where these names
 * stop naming the contract and start describing it — "Ijara — lease of an
 * asset or a service". Split on commas and "and" so a name covering three
 * things finds any of them.
 */
function namesOf(structureName: string): string[] {
  return structureName
    .split('—')[0]
    .toLowerCase()
    .split(/,| and /)
    .map((w) => w.replace(/[^a-z' ]/g, '').trim())
    .filter((w) => w.length >= 4);
}

export function recognise(input: {
  structures: readonly Structure[];
  adopted: ReadonlySet<string>;
  text: string;
  readAt: string;
}): Recognition {
  const scored: ShapeGuess[] = [];
  const haystack = input.text.toLowerCase();

  for (const structure of input.structures) {
    const reading = readContract({
      structure,
      adopted: input.adopted.has(structure.id),
      text: input.text,
      readAt: input.readAt,
    });

    /*
     * `unclear` counts, and leaving it out was this file's first bug.
     *
     * `found` is the reader's high bar: two of a condition's own distinctive
     * terms inside one sentence. A real murabaha master agreement read against
     * the murabaha conditions came back three `unclear` and three `absent`,
     * with no `found` at all — so scoring on `found` alone gave every one of
     * the nineteen shapes a zero and the screen offered nothing.
     *
     * Which is the right answer for *is this condition satisfied* and the
     * wrong one for *which kind of contract is this*. Partial word overlap is
     * exactly the evidence recognition runs on, so it counts — at half, so a
     * shape that squarely matches still outranks one that half-matches twice
     * as often.
     */
    const found = reading.conditions.filter((c) => c.standing === 'found');
    const partly = reading.conditions.filter((c) => c.standing === 'unclear');
    const named = namesOf(structure.name).find((n) => haystack.includes(n)) ?? null;

    const weight = found.length + partly.length / 2;
    // A document that names the shape is worth offering even on thin overlap.
    if (weight < WORTH_OFFERING && !named) continue;

    scored.push({
      structureId: structure.id,
      name: structure.name,
      found: found.length,
      partly: partly.length,
      of: reading.conditions.length,
      matched: [...found, ...partly].map((c) => c.requirement),
      namedInTheDraft: named,
    });
  }

  /*
   * By the share of the shape's own conditions, not the raw count.
   *
   * A shape with six conditions and three found is a better suggestion than
   * one with three conditions and three found only if you ignore that the
   * second matched everything it asks for. Ranking on the raw number would put
   * the wordiest shapes on top of every draft.
   */
  /*
   * A draft that names the shape goes above one that only shares vocabulary,
   * however good the overlap. Within each of those two groups, by the share of
   * the shape's own conditions the words turn up in — not the raw count, which
   * would put the wordiest shapes on top of every draft.
   */
  const share = (g: ShapeGuess) => (g.found + g.partly / 2) / g.of;
  scored.sort(
    (a, b) =>
      Number(Boolean(b.namedInTheDraft)) - Number(Boolean(a.namedInTheDraft)) ||
      share(b) - share(a) ||
      b.found - a.found,
  );

  return {
    readAt: input.readAt,
    guesses: scored.slice(0, MOST),
    note:
      'These are the shapes whose conditions use words that appear in this draft. It is a count of ' +
      'words, not a reading of the agreement, and the shape at the top is where the most of them ' +
      'are rather than the one this is. Choose the shape yourself.',
  };
}
