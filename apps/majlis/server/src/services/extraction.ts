/**
 * Reading figures out of a document the bank supplied.
 *
 * A board's screening or purification needs six numbers off a balance sheet.
 * Today somebody types them, and a typed figure carries no provenance at all:
 * one member entered 3,200,000 and nobody afterwards can say from where.
 *
 * ── the whole of the design ───────────────────────────────────────────────
 *
 * **Extraction proposes. It never fills anything in.**
 *
 * It exists because of one failure mode: a model that misreads 5,100 as 51,000,
 * or takes the wrong line from a balance sheet, produces a number the board
 * then rules on and the parameter hash locks forever. So this produces
 * **candidates**, and a candidate is not a figure until a person says it is.
 *
 * ── what makes this different from asking a question ──────────────────────
 *
 * The assistant answers a question, and nothing can check the answer except a
 * scholar's judgement. Extraction is a claim about a document that is **in the
 * room**, so most of it can be checked before anyone sees it:
 *
 *   **The value must appear in the quote.** A candidate whose value is not in
 *   the sentence it says it came from is a model contradicting itself, and it
 *   is discarded rather than shown as unconfirmed. Showing it would put a
 *   scholar in the position of catching a fabrication, which is not their job
 *   and not what confirmation is for.
 *
 *   **The quote must appear in the document**, where the document's text is
 *   available. For a plain text or CSV statement it is. For a PDF this service
 *   sends the file itself and has no text of its own to check against, so the
 *   candidate says so: `quoteVerified` is false, and the interface can tell a
 *   scholar that the quote is the model's account of the document rather than
 *   an excerpt anybody has matched.
 *
 * **"I could not find it" is a first-class answer.** A model asked for a figure
 * will produce one. The candidate carries `notFound`, and a gap a scholar looks
 * at is the opposite of a silently plausible zero.
 *
 * ── and it is transcription, never a reading ──────────────────────────────
 *
 * Gate 3, the output constraint the assistant already uses, runs here too — but
 * on the model's own words rather than on the whole response, and the
 * difference is the interesting half.
 *
 * A model that writes "non-permissible income is 3.2%, which is within the
 * threshold" has stopped transcribing and started ruling, and the whole
 * response is refused. The same sentence **inside a quote** is a bank's
 * prospectus talking, and refusing it would be refusing to transcribe what the
 * page says — which is the opposite of the job.
 *
 * So the quotes are exempt from gate 3 and are held to a different test: they
 * must appear in the document. A verdict smuggled in as a quote is discarded
 * for not matching, and where there is no text to match against the candidate
 * carries `quoteVerified` false, which is the interface saying these are the
 * model's words about the document rather than words anybody checked.
 */

import Anthropic from '@anthropic-ai/sdk';
import { outputBreachesConstraint } from './assistant.js';

export const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL ?? 'claude-sonnet-4-6';

/** Enough for a page of figures with their quotes, and no more. */
const MAX_TOKENS = 4096;

export interface FigureCandidate {
  /** Which figure this is offered for. */
  field: string;
  /** What was read, exactly as read. Never normalised on the way in. */
  value: string | null;
  /** The sentence it came from, verbatim. */
  quote: string | null;
  /** Where in the document. */
  locator: { page: number; label?: string } | null;
  /**
   * Whether the quote was found in the document's own text.
   *
   * True where this service held the text and matched it. False where it sent
   * the file itself — a PDF — and has nothing of its own to check against, so
   * the quote is the model's account of the document rather than an excerpt
   * anybody has verified.
   */
  quoteVerified: boolean;
  /**
   * Confirmed by a person, or not yet.
   *
   * Nothing enters a calculation until this is set. Extraction never sets it.
   */
  confirmedBy: string | null;
  confirmedAt: string | null;
  /** Set where the assistant could not find it. Never a zero. */
  notFound: boolean;
}

export interface Extraction {
  documentName: string;
  /** What the model was asked to look for, so a reader can see what was not asked. */
  fields: string[];
  candidates: FigureCandidate[];
  /**
   * Candidates thrown away before anyone saw them, and why.
   *
   * Reported rather than hidden. A model that contradicted itself twice on one
   * document is a fact a scholar should have, and a silent discard would make
   * a bad extraction look like a thin one.
   */
  discarded: { field: string; reason: string }[];
  note: string;
}

export const NOT_A_READING =
  'These are proposals read out of a document, not figures. Nothing here enters a calculation ' +
  'until a member confirms it against the quote beside it. What the figures mean, and whether ' +
  'the right line was taken, are not answered here.';

const SYSTEM_PROMPT = `You transcribe figures from financial documents for a Shariah supervisory board.

You are given a document and a list of fields. For each field you return what the document says, the exact sentence or table row it came from, and where in the document it was found.

ABSOLUTE CONSTRAINT — you do not interpret, assess, conclude or advise.

You do not say whether a figure is high or low, within or outside a threshold, permissible, impermissible, compliant, acceptable or concerning. You do not compute ratios. You do not suggest what the board should do. You transcribe.

RULES

1. Return the value exactly as the document writes it. Do not convert units, strip separators, change a currency, or turn a percentage into a decimal. If the document says "3,200,000" you return "3,200,000".

2. The quote must be text that appears in the document, copied exactly. The value you return must appear inside the quote you return. If you cannot produce a quote containing the value, the field is not found.

3. If a field is not in the document, set notFound to true and leave value and quote null. Do not infer it from a related figure. Do not return zero. "It is not here" is the correct and expected answer for a document that does not contain a field.

4. If a field appears more than once and the occurrences disagree, treat it as not found and say so in the quote field of a discarded entry rather than choosing one.

Reply with JSON only, in this shape:

{"candidates":[{"field":"...","value":"..."|null,"quote":"..."|null,"page":number|null,"label":"..."|null,"notFound":boolean}]}`;

export interface ExtractOptions {
  /** The document, as it was stored. */
  bytes: Buffer;
  mediaType: string;
  documentName: string;
  /** What to look for. The caller names these; the model does not choose. */
  fields: string[];
  /** Test seam. Production callers pass nothing and get a real client. */
  client?: Pick<Anthropic, 'messages'> | { messages: { create: (...args: never[]) => unknown } };
}

/** Where the document's own text is available to check a quote against. */
const TEXT_TYPES = new Set(['text/plain', 'text/csv']);

/**
 * Loose enough to survive whitespace, strict enough to catch a fabrication.
 *
 * A model copying a table row will not reproduce the run of spaces a PDF puts
 * between columns, and refusing over that would discard good candidates. It
 * will not accidentally reproduce a sentence that is not there.
 */
function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function contains(haystack: string, needle: string): boolean {
  return normalise(haystack).includes(normalise(needle));
}

/**
 * A number as the document writes it, compared without its punctuation.
 *
 * "3,200,000" in a quote and "3200000" as a value are the same figure, and a
 * check that rejected the pair would be enforcing a formatting convention
 * rather than catching an invention. What it still catches is the failure this
 * whole design exists for: 5,100 read as 51,000.
 */
function digitsOf(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

function valueIsInQuote(value: string, quote: string): boolean {
  if (contains(quote, value)) return true;

  const asDigits = digitsOf(value);
  return asDigits.length > 0 && digitsOf(quote).includes(asDigits);
}

interface RawCandidate {
  field?: unknown;
  value?: unknown;
  quote?: unknown;
  page?: unknown;
  label?: unknown;
  notFound?: unknown;
}

const asString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

/**
 * Everything that has to be true before a candidate is offered to a board.
 *
 * Exported and pure, so the rules can be read and tested without a model. This
 * is where the design actually lives: the prompt asks, and this decides.
 */
export function screenCandidates(
  raw: RawCandidate[],
  fields: string[],
  documentText: string | null,
): { candidates: FigureCandidate[]; discarded: { field: string; reason: string }[] } {
  const candidates: FigureCandidate[] = [];
  const discarded: { field: string; reason: string }[] = [];

  /** Fields the model answered for at all, so a second answer is a duplicate. */
  const answered = new Set<string>();
  /** Fields a candidate was actually produced for, so the rest come back absent. */
  const produced = new Set<string>();

  for (const item of raw) {
    const field = asString(item.field);
    if (!field || !fields.includes(field)) {
      // A field nobody asked for is not a bonus. It is the model deciding what
      // the board wanted, which is the one thing this must never do.
      discarded.push({
        field: field ?? '(unnamed)',
        reason: 'That field was not asked for. Nothing offers a figure the board did not request.',
      });
      continue;
    }
    if (answered.has(field)) {
      discarded.push({
        field,
        reason: 'The same field was returned twice. Choosing between them would be a reading.',
      });
      continue;
    }
    answered.add(field);

    const value = asString(item.value);
    const quote = asString(item.quote);

    if (item.notFound === true || (!value && !quote)) {
      produced.add(field);
      candidates.push({
        field,
        value: null,
        quote: null,
        locator: null,
        quoteVerified: false,
        confirmedBy: null,
        confirmedAt: null,
        // A gap a scholar looks at is the opposite of a silently plausible zero.
        notFound: true,
      });
      continue;
    }

    if (!value || !quote) {
      discarded.push({
        field,
        reason:
          'A value arrived without the sentence it came from, or a sentence without a value. ' +
          'A figure a scholar cannot check against its source is not worth offering.',
      });
      continue;
    }

    if (!valueIsInQuote(value, quote)) {
      discarded.push({
        field,
        reason:
          `"${value}" does not appear in the sentence offered as its source. That is the model ` +
          'contradicting itself, and it is discarded rather than shown — catching a fabrication ' +
          'is not what confirmation is for.',
      });
      continue;
    }

    const quoteVerified = documentText !== null && contains(documentText, quote);
    if (documentText !== null && !quoteVerified) {
      discarded.push({
        field,
        reason:
          'The sentence offered as the source is not in the document. Where the text is here to ' +
          'be checked, a quote that does not match it is a quote that was written rather than ' +
          'copied.',
      });
      continue;
    }

    const page = typeof item.page === 'number' && Number.isFinite(item.page) ? item.page : null;
    produced.add(field);
    candidates.push({
      field,
      value,
      quote,
      locator: page === null ? null : { page, label: asString(item.label) ?? undefined },
      quoteVerified,
      confirmedBy: null,
      confirmedAt: null,
      notFound: false,
    });
  }

  /*
   * A field with no candidate is absent, and absent is a state a scholar has
   * to see.
   *
   * This covers a field the model never mentioned and a field whose answer was
   * discarded, and the second is the one that matters: a discarded candidate
   * that simply vanished would leave a shorter list rather than a gap, and a
   * shorter list is the thing nobody notices.
   */
  for (const field of fields) {
    if (!produced.has(field)) {
      candidates.push({
        field,
        value: null,
        quote: null,
        locator: null,
        quoteVerified: false,
        confirmedBy: null,
        confirmedAt: null,
        notFound: true,
      });
    }
  }

  return { candidates, discarded };
}

/**
 * The sentence that travels with a confirmed figure into the fatwa.
 *
 * A hand-typed figure has no provenance. This one carries the document, the
 * page, the sentence and the member who agreed it was right — which is a
 * stronger audit trail than the manual path it replaces, and the reason the
 * whole feature is worth its risk.
 */
export function provenanceOf(
  candidate: FigureCandidate,
  documentName: string,
  confirmedBy: string,
  at: string,
): string {
  if (candidate.notFound || !candidate.value) {
    return `Not found in "${documentName}".`;
  }

  const where = candidate.locator ? `, page ${candidate.locator.page}` : '';
  const checked = candidate.quoteVerified
    ? ''
    : ' The quote is the reading assistant’s account of the document rather than an excerpt this ' +
      'system matched against its text.';

  return (
    `Extracted from "${documentName}"${where} — "${candidate.quote}" — confirmed by ` +
    `${confirmedBy} on ${at.slice(0, 10)}.${checked}`
  );
}

function textOf(bytes: Buffer, mediaType: string): string | null {
  return TEXT_TYPES.has(mediaType) ? bytes.toString('utf8') : null;
}

function blockFor(bytes: Buffer, mediaType: string) {
  if (TEXT_TYPES.has(mediaType)) {
    return { type: 'text' as const, text: bytes.toString('utf8').slice(0, 400_000) };
  }
  return {
    type: 'document' as const,
    source: { type: 'base64' as const, media_type: mediaType, data: bytes.toString('base64') },
  };
}

export class ExtractionRefused extends Error {
  constructor(
    readonly code: 'unreadable' | 'breached_constraint',
    message: string,
  ) {
    super(message);
    this.name = 'ExtractionRefused';
  }
}

export async function extract(options: ExtractOptions): Promise<Extraction> {
  const client =
    options.client ??
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 120_000 });

  const documentText = textOf(options.bytes, options.mediaType);

  const response = (await (client as Anthropic).messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          blockFor(options.bytes, options.mediaType),
          {
            type: 'text',
            text: `Fields to transcribe: ${options.fields.join(', ')}`,
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

  let parsed: { candidates?: RawCandidate[] };
  try {
    const json = answer.slice(answer.indexOf('{'), answer.lastIndexOf('}') + 1);
    parsed = JSON.parse(json) as { candidates?: RawCandidate[] };
  } catch {
    throw new ExtractionRefused(
      'unreadable',
      'The reading assistant did not answer in a shape this system could read. Nothing is ' +
        'proposed, and the figures can be typed in as they always could.',
    );
  }

  /*
   * Gate 3, on what the model said rather than on what the document says.
   *
   * The assistant runs it over a whole answer, because the whole answer is the
   * model's. Here most of the output is a quotation, and a verdict inside a
   * quote belongs to the bank that wrote the document — refusing it would be
   * refusing to transcribe what the page actually says, which is the opposite
   * of the job. A prospectus that reads "the ratio, which is within the limit"
   * is a prospectus, not a model overstepping.
   *
   * So the check runs on everything except the quotes: the prose around the
   * JSON, and the values and field names. A verdict there is the model's own,
   * and one that reached for a verdict once is not one to take the rest of the
   * page from — so the whole response is refused rather than filtered.
   *
   * What this leaves is a verdict smuggled in as a quote. Where the document's
   * text is here, such a quote is discarded for not matching it. Where it is
   * not — a PDF — the candidate is shown with `quoteVerified` false, which is
   * the interface telling a scholar that these are the model's words about the
   * document rather than words anybody matched against it.
   */
  const raw = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const modelsOwnWords = [
    answer.slice(0, Math.max(0, answer.indexOf('{'))),
    answer.slice(answer.lastIndexOf('}') + 1),
    ...raw.flatMap((c) => [asString(c.field), asString(c.value), asString(c.label)]),
  ]
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .join('\n');

  if (outputBreachesConstraint(modelsOwnWords)) {
    throw new ExtractionRefused(
      'breached_constraint',
      'The reading assistant went beyond transcription and offered an assessment of its own. ' +
        'Nothing from that response is used. Whether a figure is within a threshold is a ruling, ' +
        'and no figure on any balance sheet answers it.',
    );
  }

  const { candidates, discarded } = screenCandidates(raw, options.fields, documentText);

  return {
    documentName: options.documentName,
    fields: options.fields,
    candidates,
    discarded,
    note: NOT_A_READING,
  };
}
