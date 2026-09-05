import { describe, it, expect } from 'vitest';
import {
  ExtractionRefused,
  NOT_A_READING,
  extract,
  provenanceOf,
  screenCandidates,
  type FigureCandidate,
} from '../src/services/extraction.js';

/**
 * Reading figures out of a document.
 *
 * The whole design in one line: **extraction proposes and never fills anything
 * in.** These hold the guards that make a proposal safe to put in front of a
 * board — and every one of them runs without a model, which is why they are in
 * `screenCandidates` rather than in a prompt.
 */

const FIELDS = ['nonPermissibleIncome', 'totalRevenue', 'marketCapitalisation'];

const DOCUMENT =
  'Interim accounts, H1 2026.\n' +
  'Total revenue 100,000,000 AED.\n' +
  'Total non-permissible income 3,200,000 AED.\n';

const screen = (raw: unknown[], text: string | null = DOCUMENT) =>
  screenCandidates(raw as never[], FIELDS, text);

const found = (over: Partial<FigureCandidate> = {}) => ({
  field: 'nonPermissibleIncome',
  value: '3,200,000',
  quote: 'Total non-permissible income 3,200,000 AED.',
  page: 14,
  notFound: false,
  ...over,
});

describe('a value must appear in the sentence it came from', () => {
  it('accepts one that does', () => {
    const { candidates, discarded } = screen([found()]);
    const mine = candidates.find((c) => c.field === 'nonPermissibleIncome')!;

    expect(mine.value).toBe('3,200,000');
    expect(mine.notFound).toBe(false);
    expect(discarded).toEqual([]);
  });

  it('discards one that does not, rather than showing it unconfirmed', () => {
    // This is the failure the whole design exists for: 5,100 read as 51,000.
    const { candidates, discarded } = screen([found({ value: '51,000' })]);

    expect(discarded[0].reason).toContain('contradicting itself');
    // And it comes back as absent rather than missing entirely, so a scholar
    // sees a gap rather than a shorter list.
    expect(candidates.find((c) => c.field === 'nonPermissibleIncome')?.notFound).toBe(true);
  });

  it('does not enforce a formatting convention while doing it', () => {
    // "3,200,000" in the quote and "3200000" as the value are one figure. A
    // check that rejected the pair would be catching punctuation, not invention.
    const { discarded } = screen([found({ value: '3200000' })]);
    expect(discarded).toEqual([]);
  });

  it('discards a value with no quote at all', () => {
    const { discarded } = screen([found({ quote: null })]);
    expect(discarded[0].reason).toContain('cannot check against its source');
  });
});

describe('a quote must be in the document, where the document is here to check', () => {
  it('marks one that was matched as verified', () => {
    expect(screen([found()]).candidates[0].quoteVerified).toBe(true);
  });

  it('discards a quote the document does not contain', () => {
    const invented = found({
      value: '3,200,000',
      quote: 'Non-permissible income for the period was 3,200,000 AED, within the usual range.',
    });
    const { discarded } = screen([invented]);

    expect(discarded[0].reason).toContain('written rather than copied');
  });

  it('survives whitespace, because a table row is not copied space for space', () => {
    const spaced = found({ quote: 'Total   non-permissible\n  income 3,200,000 AED.' });
    expect(screen([spaced]).discarded).toEqual([]);
  });

  it('says plainly when it had no text to check against', () => {
    // A PDF: the file is sent and this service holds no text of its own, so the
    // quote is the model's account of the document rather than an excerpt.
    const { candidates, discarded } = screen([found()], null);

    expect(discarded).toEqual([]);
    expect(candidates[0].quoteVerified).toBe(false);
    expect(candidates[0].value).toBe('3,200,000');
  });
});

describe('not found is a first-class answer', () => {
  it('carries it through rather than turning it into a zero', () => {
    const { candidates } = screen([{ field: 'totalRevenue', notFound: true }]);
    const mine = candidates.find((c) => c.field === 'totalRevenue')!;

    expect(mine.notFound).toBe(true);
    expect(mine.value).toBeNull();
    // A model asked for a figure will produce one; a gap a scholar looks at is
    // the opposite of a silently plausible zero.
    expect(mine.value).not.toBe('0');
  });

  it('reports a field nobody answered for as absent rather than leaving it out', () => {
    const { candidates } = screen([found()]);

    expect(candidates.map((c) => c.field).sort()).toEqual([...FIELDS].sort());
    expect(candidates.find((c) => c.field === 'marketCapitalisation')?.notFound).toBe(true);
  });

  it('treats an empty answer as every field absent', () => {
    const { candidates } = screen([]);
    expect(candidates).toHaveLength(FIELDS.length);
    expect(candidates.every((c) => c.notFound)).toBe(true);
  });
});

describe('what it refuses to take from a model', () => {
  it('discards a field nobody asked for', () => {
    const { candidates, discarded } = screen([
      found(),
      { field: 'totalAssets', value: '1', quote: 'Total assets 1.', notFound: false },
    ]);

    // A bonus field is the model deciding what the board wanted.
    expect(discarded.some((d) => d.field === 'totalAssets')).toBe(true);
    expect(candidates.some((c) => c.field === 'totalAssets')).toBe(false);
  });

  it('discards the second of two answers for one field rather than choosing', () => {
    const { discarded } = screen([found(), found({ value: '3,200,001' })]);
    expect(discarded[0].reason).toContain('Choosing between them would be a reading');
  });

  it('discards an entry with no field name', () => {
    expect(screen([{ value: '1', quote: '1' }]).discarded[0].field).toBe('(unnamed)');
  });
});

describe('nothing arrives confirmed', () => {
  it('leaves every candidate unconfirmed, whatever the model said', () => {
    const { candidates } = screen([
      { ...found(), confirmedBy: 'member-a', confirmedAt: '2026-09-05T00:00:00Z' },
    ]);

    // A model cannot confirm on a scholar's behalf, and cannot be allowed to
    // say that it did.
    expect(candidates[0].confirmedBy).toBeNull();
    expect(candidates[0].confirmedAt).toBeNull();
  });
});

describe('the sentence a confirmed figure carries into the fatwa', () => {
  const candidate = screen([found()]).candidates[0];

  it('names the document, the page, the quote and who agreed it', () => {
    const line = provenanceOf(candidate, 'Interim accounts, H1 2026', 'member-a', '2026-09-05T09:00:00Z');

    expect(line).toContain('Interim accounts, H1 2026');
    expect(line).toContain('page 14');
    expect(line).toContain('Total non-permissible income 3,200,000 AED.');
    expect(line).toContain('confirmed by member-a on 2026-09-05');
  });

  it('says when the quote was never matched against the document', () => {
    const unmatched = screen([found()], null).candidates[0];
    const line = provenanceOf(unmatched, 'Prospectus.pdf', 'member-a', '2026-09-05T09:00:00Z');

    expect(line).toContain('rather than an excerpt this system matched');
  });

  it('says plainly that a field was not found rather than inventing a citation', () => {
    const absent = screen([{ field: 'totalRevenue', notFound: true }]).candidates.find(
      (c) => c.field === 'totalRevenue',
    )!;
    expect(provenanceOf(absent, 'Interim accounts', 'member-a', '2026-09-05T09:00:00Z')).toBe(
      'Not found in "Interim accounts".',
    );
  });
});

// ── the model call, with the model stubbed ────────────────────────────────

const reply = (text: string) => ({
  messages: {
    create: async () => ({ content: [{ type: 'text', text }] }),
  },
});

const run = (text: string, over: Record<string, unknown> = {}) =>
  extract({
    bytes: Buffer.from(DOCUMENT),
    mediaType: 'text/plain',
    documentName: 'Interim accounts, H1 2026',
    fields: FIELDS,
    client: reply(text) as never,
    ...over,
  });

describe('the round trip', () => {
  it('screens what comes back and carries the sentence about what it is not', async () => {
    const out = await run(
      JSON.stringify({
        candidates: [
          {
            field: 'nonPermissibleIncome',
            value: '3,200,000',
            quote: 'Total non-permissible income 3,200,000 AED.',
            page: 2,
            notFound: false,
          },
        ],
      }),
    );

    expect(out.candidates.find((c) => c.field === 'nonPermissibleIncome')?.value).toBe('3,200,000');
    expect(out.note).toBe(NOT_A_READING);
    expect(out.note).toContain('until a member confirms it');
    expect(out.documentName).toBe('Interim accounts, H1 2026');
  });

  it('refuses the whole response where the model reached for a verdict of its own', async () => {
    // A model that offered an assessment once is not one to take the rest of
    // the page from, so nothing from that response is used.
    await expect(
      run(
        'Having read the accounts, this is permissible.\n' +
          JSON.stringify({ candidates: [{ field: 'totalRevenue', notFound: true }] }),
      ),
    ).rejects.toBeInstanceOf(ExtractionRefused);
  });

  it('refuses a verdict smuggled into a value or a label', async () => {
    await expect(
      run(
        JSON.stringify({
          candidates: [
            {
              field: 'totalRevenue',
              value: '100,000,000',
              quote: 'Total revenue 100,000,000 AED.',
              label: 'Revenue, which is permissible',
              notFound: false,
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(ExtractionRefused);
  });

  it('does not refuse a verdict inside a quote, because that is the document talking', async () => {
    /*
     * A prospectus that reads "the ratio, which is within the limit" is a
     * prospectus. Refusing to transcribe it would be refusing to report what
     * the page says, which is the opposite of the job — so the quote is held
     * to a different test instead: it must be in the document.
     */
    const out = await run(
      JSON.stringify({
        candidates: [
          {
            field: 'nonPermissibleIncome',
            value: '3,200,000',
            quote: 'Total non-permissible income 3,200,000 AED, which is permissible.',
            notFound: false,
          },
        ],
      }),
    );

    // Not refused — and discarded, because that sentence is not in the document.
    expect(out.discarded[0].reason).toContain('written rather than copied');
    expect(out.candidates.find((c) => c.field === 'nonPermissibleIncome')?.notFound).toBe(true);
  });

  it('shows such a quote unverified where there is no text to check it against', async () => {
    const out = await run(
      JSON.stringify({
        candidates: [
          {
            field: 'nonPermissibleIncome',
            value: '3,200,000',
            quote: 'Total non-permissible income 3,200,000 AED, which is permissible.',
            notFound: false,
          },
        ],
      }),
      { mediaType: 'application/pdf', bytes: Buffer.from('%PDF-1.7') },
    );

    const mine = out.candidates.find((c) => c.field === 'nonPermissibleIncome')!;
    expect(mine.value).toBe('3,200,000');
    // The interface says these are the model's words about the document rather
    // than words anybody matched against it.
    expect(mine.quoteVerified).toBe(false);
  });

  it('says the figures can still be typed where the answer was unreadable', async () => {
    try {
      await run('I had a look and it seems fine.');
      expect.unreachable();
    } catch (e) {
      expect((e as ExtractionRefused).code).toBe('unreadable');
      expect((e as Error).message).toContain('can be typed in as they always could');
    }
  });

  it('finds the JSON inside a reply that wrapped it in prose', async () => {
    const out = await run(
      'Here is what I found:\n' +
        JSON.stringify({ candidates: [{ field: 'totalRevenue', notFound: true }] }) +
        '\nThat is everything.',
    );
    expect(out.candidates.find((c) => c.field === 'totalRevenue')?.notFound).toBe(true);
  });
});
