import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from './lib/i18n.js';
import ReadDocument, { readsAs } from './components/ReadDocument.js';
import { within } from '@testing-library/react';

/**
 * A figure of the wrong kind is shown and not offered.
 *
 * ── the press this removes ────────────────────────────────────────────────
 *
 * Found by running the late payment calculator against a real murabaha
 * payment schedule. The form asked for *the amount the contract names*. The
 * reader came back with **"1.5% per month"**, quoted exactly from clause 3.4,
 * and offered a button that would have put it into the money field.
 *
 * Every check in the system passed, because every check was true: the value
 * is in the quote, the quote is in the document, nothing was invented. It is
 * simply not an amount. The screening on the server cannot see this — it
 * knows the document and not the form — so the form is where it belongs.
 *
 * What a scholar gets instead is the reading, the quote, and a sentence
 * saying it is not an amount and the field is theirs. Nothing is hidden: the
 * clause is the most interesting thing on the page, and it is a rate.
 */

const QUOTE =
  'Should the Customer fail to pay any instalment when due, an additional amount of 1.5% per month shall accrue.';

const candidate = (over: Record<string, unknown> = {}) => ({
  field: 'stipulated',
  value: '1.5% per month',
  quote: QUOTE,
  locator: { page: 1 },
  quoteVerified: true,
  confirmedBy: null,
  confirmedAt: null,
  notFound: false,
  ...over,
});

const DOCUMENT = {
  matterId: 'm1',
  matterTitle: 'A murabaha draft',
  sourceId: 's1',
  label: 'Payment schedule',
  name: 'schedule.txt',
  bytes: 600,
  mediaType: 'text/plain',
  addedBy: 'member-a',
  at: '2026-09-21T09:00:00.000Z',
  withdrawn: false,
};

function stub(candidates: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.includes('/api/health'))
        return json({ ok: true, stage: 2, documents: 'disk', reading: 'anthropic' });
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      if (url.includes('/extract'))
        return json({
          documentName: 'schedule.txt',
          fields: ['stipulated'],
          candidates,
          discarded: [],
          note: 'Nothing here is a figure until a member confirms it.',
        });
      if (url.includes('/api/documents')) return json({ documents: [DOCUMENT] });
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

async function readIt(fields: { key: string; label: string; kind?: 'money' | 'date' | 'share' | 'text' }[]) {
  const onConfirm = vi.fn();
  render(
    <I18nProvider>
      <ReadDocument fields={fields} onConfirm={onConfirm} />
    </I18nProvider>,
  );

  fireEvent.click(await screen.findByRole('button', { name: /Read the figures from a document/ }));
  await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 's1' } });
  fireEvent.click(screen.getByRole('button', { name: /^Read it$/ }));

  /* The act window. Nothing is sent until it is confirmed there. */
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /^Read it$/ }));
  return onConfirm;
}


describe('a rate offered for a money field', () => {
  it('is shown with its quote', async () => {
    stub([candidate()]);
    await readIt([{ key: 'stipulated', label: 'The amount the contract names', kind: 'money' }]);

    await screen.findAllByText(/1.5% per month/);
    expect(screen.getAllByText(new RegExp(QUOTE.slice(0, 40))).length).toBeGreaterThan(0);
  });

  it('carries no button that would put it in the field', async () => {
    stub([candidate()]);
    await readIt([{ key: 'stipulated', label: 'The amount the contract names', kind: 'money' }]);

    await screen.findAllByText(/1.5% per month/);
    expect(screen.queryByRole('button', { name: /Confirm this figure/ })).not.toBeInTheDocument();
    expect(screen.getByText(/That is not an amount/)).toBeInTheDocument();
  });

  it('still offers an amount, so the rule has not simply turned the panel off', async () => {
    stub([candidate({ value: 'AED 1,240,000', quote: 'The outstanding balance was AED 1,240,000.' })]);
    const onConfirm = await readIt([
      { key: 'stipulated', label: 'The amount the contract names', kind: 'money' },
    ]);

    const take = await screen.findByRole('button', { name: /Confirm this figure/ });
    fireEvent.click(take);
    expect(onConfirm).toHaveBeenCalledWith(
      'stipulated',
      'AED 1,240,000',
      expect.stringContaining('The outstanding balance was AED 1,240,000.'),
    );
  });
});

describe('what counts as which kind', () => {
  /*
   * Pure, so the rule can be read without a model and without a screen. The
   * money cases are the ones that matter: each false below was a press that
   * would have put something that is not an amount into an amount.
   */
  it('money', () => {
    for (const ok of ['3,200,000', 'AED 1,240,000', '4250000', '1 240 000 AED', '$51.25']) {
      expect(readsAs('money', ok)).toBe(true);
    }
    for (const no of ['1.5% per month', '1.5%', '18% p.a.', 'per month', '', 'AED 100 per day']) {
      expect(readsAs('money', no)).toBe(false);
    }
  });

  it('date', () => {
    expect(readsAs('date', '2026-03-01')).toBe(true);
    for (const no of ['1 March 2026', '03/01/2026', 'on the due date', '']) {
      expect(readsAs('date', no)).toBe(false);
    }
  });

  it('share', () => {
    for (const ok of ['31', '31%', '4.75%', '100']) expect(readsAs('share', ok)).toBe(true);
    for (const no of ['AED 4,250,000', '140%', 'a third', '']) {
      expect(readsAs('share', no)).toBe(false);
    }
  });

  it('text takes anything that is there, and nothing that is not', () => {
    expect(readsAs('text', 'instalment 5 under facility MRB-2026-118')).toBe(true);
    expect(readsAs(undefined, 'anything at all')).toBe(true);
    expect(readsAs('text', '   ')).toBe(false);
  });
});
