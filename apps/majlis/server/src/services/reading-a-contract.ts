/**
 * A contract somebody sent in, read against the conditions this board adopted.
 *
 * This is what the AI advisers sell — upload a contract, get it checked — and
 * it is the one thing they do that Majlis could not. The difference is what
 * comes out. They return a verdict: compliant, partially compliant,
 * non-compliant. This returns **where each condition is answered in the text,
 * and where it is not**, and then stops, because whether the answer is good
 * enough is the board's finding and not a machine's.
 *
 * ── it finds; it does not judge ───────────────────────────────────────────
 *
 * A condition is `found`, `absent`, or `unclear`. There is deliberately no
 * `met`. `met` is a `ConditionFinding`, it carries a scholar's name and a
 * reason, and it is recorded by a person on the checklist. Producing one here
 * would be this file ruling — which is the line the whole product is drawn
 * around.
 *
 * ── every finding carries the words it was found in ───────────────────────
 *
 * A reading that said *the ownership condition appears to be addressed* is
 * worth nothing to a scholar: they cannot check it without opening the file
 * and hunting. Each hit carries the sentence it matched and the character
 * offset it starts at, so the interface can show the passage and a member can
 * disagree with the specific words rather than with a verdict.
 *
 * ── unclear is a real answer and is not a soft no ─────────────────────────
 *
 * A condition whose terms appear but scattered, or appear only once in a
 * definitions list, is `unclear`. Collapsing that into `absent` would send a
 * board looking for a clause that is there; collapsing it into `found` would
 * tell them a question is answered when nobody has read it.
 *
 * ── what it cannot do, said in the output ─────────────────────────────────
 *
 * It reads words. It does not know that *the Seller shall acquire the Asset
 * prior to the Sale* orders two events correctly, and it says so: conditions
 * whose evidence is a `sequence` are reported as needing a person, every time,
 * even when the words are all present.
 */

import type { Structure, StructureCondition } from '../types.js';

export type Standing = 'found' | 'unclear' | 'absent';

export interface Passage {
  /** The sentence the words were found in, as it appears in the contract. */
  text: string;
  /** Where it starts, so an interface can scroll to it rather than search. */
  at: number;
}

export interface ConditionReading {
  conditionId: string;
  requirement: string;
  standing: Standing;
  /** Where it was found. Empty when absent. At most three. */
  passages: Passage[];
  /**
   * Why this reading, in plain words a scholar can disagree with.
   *
   * Never a score and never a confidence percentage: a number invites a board
   * to treat it as a measurement, and there is nothing being measured.
   */
  note: string;
  /** True where no reading of words could settle it, whatever was found. */
  needsAPerson: boolean;
}

export interface ContractReading {
  structureId: string;
  structureName: string;
  /** Whether the board adopted this shape, or it is the shipped draft. */
  adopted: boolean;

  conditions: ConditionReading[];

  /** Characters of text read. Zero means nothing could be read out of the file. */
  charactersRead: number;

  /**
   * What this reading could not do.
   *
   * Always non-empty. There has never been a reading of a contract by a
   * machine that had nothing it could not do, and a list that came back empty
   * would be the most misleading thing this file could produce.
   */
  limits: string[];

  readAt: string;
}

/** Sentences, roughly. Good enough to quote from and cheap enough to run. */
function sentencesOf(text: string): Passage[] {
  const out: Passage[] = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const trimmed = m[0].trim();
    if (trimmed.length < 12) continue;

    /*
     * The offset points at the first character of the quoted sentence, not at
     * the whitespace before it. An interface uses this to scroll to a passage
     * and highlight it; off by the leading space, the highlight starts in the
     * gap and the quote no longer lines up with the text it came from.
     */
    out.push({ text: trimmed, at: m.index + m[0].indexOf(trimmed[0]) });
  }
  return out;
}

/**
 * The words a condition is about.
 *
 * Taken from the condition's own requirement rather than from a list this
 * file keeps: a board that adopts a shape and rewrites a condition in its own
 * words should be searched for in *those* words, not in ours. Short and very
 * common words are dropped because they match everything.
 */
const TOO_COMMON = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'for', 'must', 'shall', 'not', 'any',
  'are', 'has', 'have', 'its', 'their', 'which', 'been', 'before', 'after', 'than',
  'into', 'upon', 'such', 'may', 'can', 'all', 'one', 'two', 'was', 'were', 'will',
]);

function termsOf(requirement: string): string[] {
  return [
    ...new Set(
      requirement
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length >= 4 && !TOO_COMMON.has(w)),
    ),
  ];
}

function readCondition(
  condition: StructureCondition,
  sentences: readonly Passage[],
): ConditionReading {
  const terms = termsOf(condition.requirement);

  /*
   * A sentence counts where it carries at least two of the condition's own
   * words. One is noise — "asset" appears in every contract ever written — and
   * three is strict enough to miss a clause that says the same thing in
   * shorter words.
   */
  const scored = sentences
    .map((s) => {
      const lower = s.text.toLowerCase();
      return { s, hits: terms.filter((term) => lower.includes(term)).length };
    })
    .filter((x) => x.hits >= 2)
    .sort((a, b) => b.hits - a.hits);

  const passages = scored.slice(0, 3).map((x) => x.s);
  const strongest = scored[0]?.hits ?? 0;

  /*
   * A condition shown by an order of events can never be settled by finding
   * words. That a contract contains "acquire" and "sell" says nothing about
   * which the parties do first, and that is precisely the condition.
   */
  const needsAPerson = condition.evidence === 'sequence';

  let standing: Standing;
  let note: string;

  if (passages.length === 0) {
    standing = 'absent';
    note = 'None of the words this condition is about appear together anywhere in the text.';
  } else if (strongest >= Math.max(3, Math.ceil(terms.length / 2))) {
    standing = 'found';
    note = `The text addresses this in ${passages.length === 1 ? 'one place' : `${passages.length} places`}. Whether it addresses it adequately is the board's finding.`;
  } else {
    standing = 'unclear';
    note =
      'Some of the words appear, but scattered rather than in one clause. It may be covered, and it may be a definitions list.';
  }

  if (needsAPerson) {
    note +=
      ' This condition is about the order two things happen in, which no reading of words can settle. Somebody has to read it.';
  }

  return { conditionId: condition.id, requirement: condition.requirement, standing, passages, note, needsAPerson };
}

export function readContract(input: {
  structure: Structure;
  /** Whether the board adopted this shape, or it is the shipped draft. */
  adopted: boolean;
  /** The contract, as text. Whoever extracted it decided what counted as text. */
  text: string;
  readAt: string;
}): ContractReading {
  const sentences = sentencesOf(input.text);
  const conditions = input.structure.conditions.map((c) => readCondition(c, sentences));

  const limits: string[] = [
    'This reads words. It does not know what they mean, and it has not been trained on contracts.',
    'Nothing here is a finding. A condition is met when a member of this board says so and says why.',
  ];

  if (!input.adopted) {
    limits.push(
      'This board has not adopted this shape, so the conditions being looked for are the shipped draft rather than the board’s own.',
    );
  }
  if (conditions.some((c) => c.needsAPerson)) {
    limits.push(
      'Some conditions are about the order events happen in. No reading of the text can settle those, whatever it finds.',
    );
  }
  if (input.text.trim().length < 400) {
    limits.push(
      'Very little text came out of the file. If it is a scan, nothing here read the contract at all.',
    );
  }

  return {
    structureId: input.structure.id,
    structureName: input.structure.name,
    adopted: input.adopted,
    conditions,
    charactersRead: input.text.length,
    limits,
    readAt: input.readAt,
  };
}
