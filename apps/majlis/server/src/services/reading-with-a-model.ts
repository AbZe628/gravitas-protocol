/**
 * Reading a contract against a board's conditions, with a model.
 *
 * ── why this exists ───────────────────────────────────────────────────────
 *
 * `reading-a-contract.ts` matches the words of a condition against the words
 * of a draft and reports where they sit. It is honest, it costs nothing, it
 * runs with no key, it can be checked by anybody holding the document, and it
 * stays the reader wherever this one is switched off.
 *
 * But it reads letters, and a contract is written by somebody trying to be
 * understood rather than matched. Measured on a real murabaha draft whose
 * clause 3.2 read:
 *
 *     Should the Customer fail to pay any instalment when due, an additional
 *     amount of 1.5% per month shall accrue on the outstanding balance and
 *     shall be retained by the Bank as compensation for the delay.
 *
 * The matcher reported the condition *no increase for late payment* as
 * **absent** — the condition's words are not in that sentence. It is the
 * first clause a board would stop on, and the screen a board actually uses
 * said there was nothing there.
 *
 * ── what it is not, and that is the whole product ─────────────────────────
 *
 * It finds and it quotes. It never concludes, and there is no path here by
 * which it could: `Standing` is `found`, `unclear` or `absent`, and none of
 * the three is a verdict. **Found means the draft says something about this
 * condition** — not that the condition is satisfied. Whether it is satisfied
 * is a finding, it carries a scholar's name, and it is recorded by a person.
 *
 * The model is told this in the prompt, and told is not enough, so the same
 * gate the assistant uses runs over its own words before anything is shown.
 * A response that reached for *complies*, *permissible* or *acceptable* is
 * refused whole rather than filtered: a model that ruled once on one clause
 * is not one to take the other eleven quotations from.
 *
 * ── the three rules it keeps from the reader it stands beside ─────────────
 *
 * **The conditions are the fields.** The board names what to look for, in
 * the board's own words, and the model never chooses. A clause it thinks
 * important against no condition is not a bonus; it is the model deciding
 * what the board should care about.
 *
 * **A quote that is not in the document is not evidence.** Where the text is
 * here — pasted, or a text file — every quote is matched against it and one
 * that does not match is thrown away and reported as thrown away. Where the
 * text is not here — a PDF sent whole — nothing can be matched, so the
 * passage is shown as the model's account of the document and the condition
 * stands `unclear`. Never `found`. Found means somebody checked.
 *
 * **A condition about an order of events still needs a person.** A model can
 * read *the Bank shall purchase and then sell* and see the order the sentence
 * claims. Whether the parties did it in that order is a fact about the world,
 * so `needsAPerson` comes from the condition, exactly as before, whichever
 * reader did the reading.
 */

import Anthropic from '@anthropic-ai/sdk';
import { outputBreachesConstraint } from './assistant.js';
import { ExtractionRefused, EXTRACTION_MODEL, blockFor, contains, textOf } from './extraction.js';
import type { Structure } from '../types.js';
import type { ConditionReading, ContractReading, Passage, Standing } from './reading-a-contract.js';

/** A dozen conditions with a sentence each, and no room to write an essay. */
const MAX_TOKENS = 8192;

const SYSTEM_PROMPT = `You locate clauses in a contract for a Shariah supervisory board.

You are given a contract and a numbered list of conditions the board judges this kind of arrangement against. For each condition you point at the passage in the contract that speaks to it, or you say it is not there.

ABSOLUTE CONSTRAINT — you do not decide whether a condition is met.

You never say a contract is compliant, non-compliant, permissible, impermissible, acceptable, problematic, satisfactory, or in breach. You never say a condition is met, satisfied, violated or failed. You never advise the board what to do. The board decides; you show them where to look. A passage that plainly contradicts a condition is still reported the same way as one that plainly answers it: you quote it and you stop. Saying which is which is the board's, and it is the reason they exist.

RULES

1. The quote must be text copied exactly from the contract. Do not tidy it, do not shorten it with an ellipsis, do not paraphrase. If you cannot copy a passage, the condition is not addressed.

2. Quote the whole sentence or clause, not a fragment. A scholar must be able to read it and see its terms without opening the file.

3. If nothing in the contract speaks to a condition, set notAddressed to true and leave the quote null. Do not stretch an unrelated clause to cover it. "The contract does not deal with this" is a correct and expected answer, and a board needs to see it.

4. Report the passage whether it appears to answer the condition or to cut against it. A clause that goes the other way is the most important thing on the page and it is reported exactly like any other.

5. Give the clause number and heading as the contract writes them, in label, and the page in page. If the contract has no numbering, leave label null.

6. If two passages bear on one condition, return the one a scholar should read first. Do not return the same condition twice.

Reply with JSON only, in this shape:

{"passages":[{"condition":number,"quote":"..."|null,"page":number|null,"label":"..."|null,"notAddressed":boolean}]}`;

/** What the model could not do, said every time rather than when convenient. */
const LIMITS = [
  'This is a reading of what the document says. It is not a finding about what the parties did, and it is not a view on whether any condition is met.',
  'A passage shown here is where the draft speaks to a condition. Whether it answers it — and whether it answers it well — is the board’s, and it is recorded below by a person.',
  'A clause that cuts against a condition and a clause that answers it are both reported the same way. Reading which is which is the work, and nothing here does it.',
];

// ---------------------------------------------------------------------------

/**
 * A verdict in a clause label, which the prose gate cannot see.
 *
 * ── the hole this closes ──────────────────────────────────────────────────
 *
 * `outputBreachesConstraint` is written for sentences. It wants a pronoun and
 * a verb — *this is permissible*, *which is non-compliant* — because it
 * guards an assistant that answers in prose, and matching bare vocabulary
 * there would refuse the mechanical questions it exists for: a question about
 * a compliance report field is not a ruling.
 *
 * Here the model's own words are not sentences. They are labels, and
 * `"Clause 2.2 — compliant with the disclosure requirement"` walks straight
 * past every pattern in that list. It was found by a test that expected the
 * gate to hold and watched it not.
 *
 * ── why a label is held to a stricter rule ────────────────────────────────
 *
 * A label is not evidence. It is a pointer, and it should contain the
 * contract's own numbering and heading and nothing else. So bare vocabulary
 * is enough to condemn it, which would be far too blunt for prose.
 *
 * ── and why one is tolerated ──────────────────────────────────────────────
 *
 * Contracts really do have a clause headed *REGULATORY COMPLIANCE*, and
 * refusing to read a draft because it does would be the guard breaking the
 * product. So a label that carries a verdict is dropped — the quote stays,
 * the pointer goes — and a board is told. Two **different** such labels is
 * no longer a heading; it is a model annotating its answer with judgements,
 * and then the whole response goes, because one that ruled twice is not one
 * to take the other quotations from.
 */
const VERDICT_IN_A_LABEL =
  /\b(?:compliant|compliance|non[- ]?compliance|permissible|impermissible|prohibited|forbidden|halal|haram|riba|gharar|maysir|acceptable|unacceptable|violation|violates|breach|satisfied|unsatisfied|met|unmet|fails?|failed|passes|valid|invalid|objectionable)\b/i;

export function labelCarriesAVerdict(label: string): boolean {
  return VERDICT_IN_A_LABEL.test(label);
}

/** Exactly what the model is allowed to return, before anything believes it. */
interface RawPassage {
  condition?: unknown;
  quote?: unknown;
  page?: unknown;
  label?: unknown;
  notAddressed?: unknown;
}

const asString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

/** What a condition ended up with, before it is dressed as a reading. */
interface Located {
  quote: string | null;
  page: number | null;
  label: string | null;
  /** True only where the document's own text was here and the quote matched it. */
  verified: boolean;
  /** Set where something was offered for this condition and thrown away. */
  thrownAway: string | null;
}

/**
 * Everything that has to be true before a passage is shown to a board.
 *
 * Pure and exported, so the rules can be read and tested without a model and
 * without a key. This is where the design lives: the prompt asks, this
 * decides, and a condition nothing survives for comes back as a gap rather
 * than as a shorter list.
 *
 * `documentText` is the contract's own text where this service holds it, and
 * null where it does not — a PDF, sent whole, which nothing here can match a
 * quote against.
 */
export function screenPassages(
  raw: RawPassage[],
  conditionCount: number,
  documentText: string | null,
): Located[] {
  const out: Located[] = Array.from({ length: conditionCount }, () => ({
    quote: null,
    page: null,
    label: null,
    verified: false,
    thrownAway: null,
  }));

  /** Conditions the model answered for at all, so a second answer is a repeat. */
  const answered = new Set<number>();

  for (const item of raw) {
    const n = typeof item.condition === 'number' ? item.condition : Number(item.condition);
    if (!Number.isInteger(n) || n < 1 || n > conditionCount) continue;
    const at = n - 1;

    if (answered.has(n)) {
      /*
       * Two answers for one condition, and choosing between them would be a
       * reading. The first stands and the second is named, because a board
       * that knows the model said two things about one clause knows something
       * about the reading it is looking at.
       */
      out[at].thrownAway =
        'The reader offered a second, different passage for this condition. Choosing between them ' +
        'would be a reading, so neither was preferred: only the first is shown, and the document ' +
        'is worth opening here.';
      continue;
    }
    answered.add(n);

    const quote = asString(item.quote);

    if (item.notAddressed === true || !quote) {
      // Left as it began: nothing offered, which is a gap and shown as one.
      continue;
    }

    if (documentText !== null && !contains(documentText, quote)) {
      /*
       * The text was here and the quote is not in it. That is a sentence
       * written rather than copied, and it is thrown away rather than shown
       * with a caveat — catching a fabrication is not a scholar's job.
       */
      out[at].thrownAway =
        'A passage was offered for this and it is not in the document. Where the text is here to ' +
        'be checked, a quote that does not match it was written rather than copied, so it is not ' +
        'shown. Read this part of the draft yourself.';
      continue;
    }

    out[at] = {
      quote,
      page: typeof item.page === 'number' && Number.isFinite(item.page) ? item.page : null,
      label: asString(item.label),
      verified: documentText !== null,
      thrownAway: null,
    };
  }

  return out;
}

/**
 * One condition, as a board sees it.
 *
 * Exported beside the screening for the same reason: the mapping from what
 * survived to what a scholar reads is the part that could quietly turn a
 * located clause into a verdict, so it is testable on its own.
 */
export function readingOf(
  condition: Structure['conditions'][number],
  located: Located,
): ConditionReading {
  /*
   * From the condition, never from the reader. An order of events cannot be
   * settled by reading words, however well they were read.
   */
  const needsAPerson = condition.evidence === 'sequence';

  let standing: Standing;
  let note: string;

  if (located.thrownAway) {
    standing = 'unclear';
    note = located.thrownAway;
  } else if (!located.quote) {
    standing = 'absent';
    note =
      'The reader was asked for this and pointed at nothing in the draft. That is not the ' +
      'condition failing: the draft may deal with it in words nobody would connect to it, or it ' +
      'may genuinely be silent. Either way it is a gap to put to whoever sent the draft.';
  } else if (!located.verified) {
    standing = 'unclear';
    note =
      'The passage below is the reader’s account of the document rather than an excerpt matched ' +
      'against it — the file was sent whole and its text is not here to check against. Open the ' +
      'clause before relying on a word of it.';
  } else {
    standing = 'found';
    note = needsAPerson
      ? 'The draft says this, and what it says is about the order two things happen in. Whether ' +
        'the parties do them in that order is not something any reading of words can settle.'
      : 'The draft speaks to this condition here. Whether what it says answers the condition is ' +
        'the board’s, and it is recorded as a finding with a name on it.';
  }

  const passages: Passage[] = located.quote
    ? [
        {
          text: located.quote,
          /*
           * Zero, and honestly so. The reader names the clause rather than a
           * character offset, and inventing an offset so an interface could
           * scroll to it would be inventing a fact about the document.
           */
          at: 0,
          ...(located.label ? { label: located.label } : {}),
        },
      ]
    : [];

  return {
    conditionId: condition.id,
    requirement: condition.requirement,
    standing,
    passages,
    note,
    needsAPerson,
  };
}

// ---------------------------------------------------------------------------

export interface ModelReadingOptions {
  structure: Structure;
  /** Whether the board adopted this shape, or it is the shipped draft. */
  adopted: boolean;
  /** The contract as it was stored, or as it was pasted and encoded. */
  bytes: Buffer;
  mediaType: string;
  documentName: string;
  readAt: string;
  /** Where the document goes, for the reading to be able to say so. */
  processor?: string;
  /** Test seam. Production callers pass nothing and get a real client. */
  client?: Pick<Anthropic, 'messages'> | { messages: { create: (...args: never[]) => unknown } };
}

export async function readContractWithModel(
  options: ModelReadingOptions,
): Promise<ContractReading> {
  const { structure, adopted, bytes, mediaType, documentName, readAt } = options;

  const client =
    options.client ??
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 120_000 });

  const documentText = textOf(bytes, mediaType);

  /*
   * The conditions, numbered, in the board's own words.
   *
   * Numbered rather than named so an answer maps back to exactly one
   * condition: two conditions of one shape can be worded closely, and
   * matching on a sentence would put the model's spelling between the board's
   * condition and the passage found for it.
   */
  const asked = structure.conditions
    .map((c, i) => `${i + 1}. ${c.requirement}`)
    .join('\n');

  const response = (await (client as Anthropic).messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          blockFor(bytes, mediaType),
          {
            type: 'text',
            text:
              `Contract: ${documentName}\n\nConditions this board judges a ` +
              `${structure.name} against:\n\n${asked}`,
          },
        ],
      },
    ],
  } as never)) as { content?: { type?: string; text?: string }[] };

  const answer = (response.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();

  let parsed: { passages?: RawPassage[] };
  try {
    const json = answer.slice(answer.indexOf('{'), answer.lastIndexOf('}') + 1);
    parsed = JSON.parse(json) as { passages?: RawPassage[] };
  } catch {
    throw new ExtractionRefused(
      'unreadable',
      'The reading assistant did not answer in a shape this system could read. Nothing is shown, ' +
        'and the draft can be read against the conditions by matching words, which is what this ' +
        'did before.',
    );
  }

  const raw = Array.isArray(parsed.passages) ? parsed.passages : [];

  /*
   * The output gate, on the model's own words and not on the quotations.
   *
   * A contract that says "the Bank confirms this structure is Shariah
   * compliant" is a contract talking, and refusing to show a board that
   * sentence would be refusing to do the job. So the quotes are exempt here
   * and held to a different test — they must be in the document — while
   * everything the model wrote itself is held to the constraint it was given.
   *
   * The labels are held to their own, stricter rule below, because this one
   * is built for sentences and a label is a fragment.
   */
  const modelsOwnWords = [
    answer.slice(0, Math.max(0, answer.indexOf('{'))),
    answer.slice(answer.lastIndexOf('}') + 1),
  ]
    .filter((x) => x.trim() !== '')
    .join('\n');

  const refused = (why: string) =>
    new ExtractionRefused(
      'breached_constraint',
      why +
        ' Nothing from that response is shown. Whether a condition is met is a ruling, and it ' +
        'carries a scholar’s name.',
    );

  if (outputBreachesConstraint(modelsOwnWords)) {
    throw refused(
      'The reading assistant went beyond pointing at clauses and offered a view of its own on ' +
        'whether the contract is acceptable.',
    );
  }

  const judged = new Set(
    raw
      .map((p) => asString(p.label))
      .filter((l): l is string => l !== null && labelCarriesAVerdict(l))
      .map((l) => l.toLowerCase()),
  );

  if (judged.size > 1) {
    throw refused(
      'The reading assistant labelled more than one clause with a judgement of its own rather ' +
        'than with the contract’s heading.',
    );
  }

  /*
   * The tolerated one, removed rather than shown. A board looking at a
   * pointer that reads "— compliant" reads it as the document's own words,
   * and it is not worth the risk for a decoration.
   */
  const dropped: string[] = [];
  for (const p of raw) {
    const label = asString(p.label);
    if (label && labelCarriesAVerdict(label)) {
      dropped.push(label);
      p.label = null;
    }
  }

  const located = screenPassages(raw, structure.conditions.length, documentText);
  const conditions = structure.conditions.map((c, i) => readingOf(c, located[i]));

  const limits = [...LIMITS];

  if (dropped.length > 0) {
    limits.push(
      `A clause pointer was removed because it carried a judgement rather than a heading: “${dropped[0]}”. ` +
        'The passage it pointed at is shown; the pointer is not. Where the contract itself has a ' +
        'clause by that name, look for it under its number.',
    );
  }
  if (!adopted) {
    limits.push(
      'This board has not adopted this shape, so the conditions being looked for are the shipped draft rather than the board’s own.',
    );
  }
  if (documentText === null) {
    limits.push(
      'The file was sent whole and its text is not held here, so no passage below could be matched ' +
        'against the document. Every one of them is the reader’s account of it, which is why none ' +
        'of them is shown as found.',
    );
  }
  if (conditions.some((c) => c.needsAPerson)) {
    limits.push(
      'Some conditions are about the order events happen in. No reading of the text can settle those, whatever it finds.',
    );
  }
  const thrown = conditions.filter(
    (c) => c.standing === 'unclear' && c.passages.length === 0,
  ).length;
  if (thrown > 0) {
    limits.push(
      `${thrown} ${thrown === 1 ? 'passage was' : 'passages were'} offered and thrown away before ` +
        'anybody saw ' +
        (thrown === 1 ? 'it' : 'them') +
        '. The reason is written against the condition. A reading that discarded something is not ' +
        'a reading that found less; it is one to be more careful with.',
    );
  }

  return {
    structureId: structure.id,
    structureName: structure.name,
    adopted,
    conditions,
    /*
     * Characters of the contract this service itself read. For a text draft
     * that is all of it; for a PDF sent whole it is nothing, because nothing
     * here extracted a word — which is the same fact the limits state and the
     * same fact that keeps every condition off `found`.
     */
    charactersRead: documentText?.length ?? 0,
    limits,
    readBy: 'model',
    ...(options.processor ? { processor: options.processor } : {}),
    readAt,
  };
}
