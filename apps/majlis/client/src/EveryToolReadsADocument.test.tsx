import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from './lib/i18n.js';
import { KNOWN, One } from './components/TheCalculator.js';

/**
 * Every tool reads the figures out of a document, not only zakat.
 *
 * ── the gap this was written for ──────────────────────────────────────────
 *
 * Reading was built once and put into four of the six calculators — screening,
 * purification, profit distribution, zakat — and the two it was left out of
 * were the two where a contract is the document: **tradability** and **late
 * payment**. Nothing failed. Every test passed. The feature simply was not
 * there, on the screens where the murabaha draft with "1.5% per month" in it
 * would have been read.
 *
 * A test per calculator would have missed it exactly the same way, because
 * the missing ones had no test. So this walks `CALCULATIONS` — the list the
 * application itself renders from — and requires the panel on each. A seventh
 * calculator added without a reader fails here on the day it is added.
 *
 * ── what it does not claim ────────────────────────────────────────────────
 *
 * That the panel is present, that it names the document, and that it can be
 * opened. Whether a confirmed candidate reaches the right field is each
 * calculator's own business and is held elsewhere; what is held here is that
 * no tool is left typing figures by hand while the others read them.
 */

const DOCUMENT = {
  matterId: 'm1',
  matterTitle: 'A murabaha draft',
  sourceId: 's1',
  label: 'The draft',
  name: 'murabaha.txt',
  bytes: 914,
  mediaType: 'text/plain',
  addedBy: 'member-a',
  at: '2026-09-21T09:00:00.000Z',
  withdrawn: false,
};

/*
 * The application's own list, not a copy of it.
 *
 * A list copied here stops being true the day a seventh calculator is added,
 * and the tool that gets missed is always the one nobody listed.
 */
const KINDS = KNOWN;

function stub(reading: 'anthropic' | 'off' = 'anthropic') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.includes('/api/health')) return json({ ok: true, stage: 2, documents: 'disk', reading });
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      if (url.includes('/api/documents')) return json({ documents: [DOCUMENT] });
      if (url.includes('/api/register')) return json({ assets: [] });
      if (url.includes('/api/calculations')) return json([]);
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

/**
 * Get a calculator to the point where its figures are asked for.
 *
 * Three of them hold the figures behind a choice — the zakat base, the
 * purification method, the late payment method — because the choice decides
 * which figures the form wants. A test that rendered and looked would find
 * nothing on those three and would be measuring its own impatience, so every
 * choice with nothing selected is answered by taking its first option.
 */
async function openTheFigures() {
  /*
   * Screening folds behind a press of its own, which is how it earned the
   * first failure here: the panel was there all along and the form was not
   * open. A measure that stops at the fold reports the application missing
   * something the application has.
   */
  for (const b of screen.queryAllByRole('button')) {
    /*
     * Never the submit button. "Work it out" is also what the compute button
     * says, and pressing it here computed against a stub that answers every
     * request with an empty object — which crashed two calculators on a
     * result with no fields and had them reported as calculators with no
     * reader. The measure was wrong before the application was.
     */
    if ((b as HTMLButtonElement).type === 'submit') continue;
    if (/Work out|Work it out/i.test(b.textContent ?? '')) fireEvent.click(b);
  }

  /*
   * The choices, one fieldset at a time and twice over.
   *
   * These radios carry no `name`, so grouping by name put every choice on
   * the form into one group and answered only the first of them — which left
   * late payment without a method and made it look like the calculator with
   * no reader. Twice over because answering the first choice reveals the
   * second: on late payment the method only appears once solvency is given.
   */
  for (let round = 0; round < 3; round++) {
    let clicked = false;
    for (const set of Array.from(document.querySelectorAll('fieldset'))) {
      const radios = Array.from(set.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
      if (radios.length === 0 || radios.some((r) => r.checked)) continue;
      fireEvent.click(radios[0]);
      clicked = true;
    }
    if (!clicked) break;
    await waitFor(() => undefined);
  }

  /* A composition has no named part until somebody names one. */
  const partLabel = screen.queryAllByRole('textbox').find((x) => {
    const near = x.closest('label')?.textContent ?? '';
    return /part|جزء|حصہ/i.test(near);
  });
  if (partLabel) fireEvent.change(partLabel, { target: { value: 'Property' } });
}

describe('the reader is in every tool', () => {
  for (const kind of KINDS) {
    it(`${kind} offers to read the figures out of a document`, async () => {
      stub();
      render(
        <I18nProvider>
          <One kind={kind} />
        </I18nProvider>,
      );

      await openTheFigures();

      await waitFor(
        () => expect(screen.getByRole('button', { name: /Read the figures from a document/ })).toBeInTheDocument(),
        { timeout: 3000 },
      );
    });
  }
});

describe('and it is absent rather than refusing', () => {
  /*
   * An institution that will not send its accounts anywhere types the figures
   * in and loses nothing but time. A control that only ever refuses is worse
   * than no control, so this is the other half of the rule above.
   */
  for (const kind of KINDS) {
    it(`${kind} shows no reader where the institution turned reading off`, async () => {
      stub('off');
      render(
        <I18nProvider>
          <One kind={kind} />
        </I18nProvider>,
      );

      await openTheFigures();
      await new Promise((r) => setTimeout(r, 50));

      expect(
        screen.queryByRole('button', { name: /Read the figures from a document/ }),
      ).not.toBeInTheDocument();
    });
  }
});
