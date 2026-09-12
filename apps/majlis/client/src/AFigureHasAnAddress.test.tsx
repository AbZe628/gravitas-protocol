import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * A calculation the board recorded can be opened, and shows its working.
 *
 * ── the question this closes ──────────────────────────────────────────────
 *
 * *Where does the calculation get written down, and who is it sent to, and
 * why.* The first two thirds had answers. A figure was recorded against a
 * period, and a notice went to the bank saying so — carrying the amount, the
 * method and the source in its body, with no working and nothing to open.
 * The desk that has to act on the figure could read what it was and never how
 * it was arrived at.
 *
 * `GET /computations/:id` returns the whole of it, steps included, and has
 * done since the computations work was written. No part of the application
 * called it. It was one of six routes in that state.
 *
 * ── what is asserted, and why each ────────────────────────────────────────
 *
 * The steps are on the page, because a figure without its working is the
 * thing the notice already was. The amount appears exactly once as the record
 * wrote it — appending the currency beside it printed `AED 2,401,431.75 AED`,
 * since the stored amount already carries its unit where there is one and a
 * percentage where there is not.
 */

const ZAKAT = {
  id: 'computation-x',
  kind: 'zakat',
  boardId: 'demo-board',
  assetId: null,
  periodFrom: '2025-07-01',
  periodTo: '2026-06-30',
  method: 'net_assets',
  methodStated: 'Net assets, on the lunar year, borne by the institution.',
  currency: 'AED',
  source: 'Audited statement of financial position',
  figures: {},
  headline: 'Zakat due on the net assets base',
  amount: 'AED 2,401,431.75',
  steps: [
    { label: 'Zakatable assets', value: 'AED 120,500,000', working: '84,200,000 + 31,500,000' },
    { label: 'At the lunar rate', value: 'AED 2,399,652.50', working: '93,100,000 × 0.025775' },
  ],
  note: 'Whether the institution or the shareholders bear it is the board’s ruling, not a figure.',
  recordedBy: 'member-b',
  recordedAt: '2026-07-14T09:00:00Z',
  supersedes: null,
  withdrawnAt: null,
  withdrawnBy: null,
  withdrawalReason: null,
};

const MEANS = 'This records that the board was shown these figures.';

function json(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function wire() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, items: [] });
      if (url.includes('/api/computations/'))
        return json({ computation: ZAKAT, whatRecordingMeans: MEANS });
      return json({});
    }),
  );
}

describe('a recorded calculation has an address of its own', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens, and shows the working rather than only the figure', async () => {
    wire();
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={[`/figures/${ZAKAT.id}`]}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    );

    // The calculation itself.
    await screen.findByText(ZAKAT.headline, {}, { timeout: 4000 });

    // The method the board stated, and every step of the arithmetic. This is
    // the part the notice to the bank never carried.
    expect(screen.queryByText(ZAKAT.methodStated)).toBeTruthy();
    for (const step of ZAKAT.steps) {
      expect(screen.queryByText(step.label), `the step "${step.label}" is missing`).toBeTruthy();
      expect(screen.queryByText(step.working), `the working for "${step.label}" is missing`).toBeTruthy();
    }

    // What it does not say, carried from the server unchanged.
    expect(screen.queryByText(ZAKAT.note)).toBeTruthy();

    /*
     * And the amount exactly as the record wrote it. `getAllByText` rather
     * than `getByText` so a second, differently-formatted copy is a failure
     * with a count in it rather than an ambiguous throw.
     */
    const shown = screen.getAllByText(ZAKAT.amount);
    expect(shown.length, 'the amount is on the page more than once').toBe(1);
    expect(screen.queryByText(`${ZAKAT.amount} ${ZAKAT.currency}`)).toBeNull();
  });

  it('says so plainly when the address names nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/attention'))
          return json({ scholarId: 'member-a', role: 'signatory', office: null, items: [] });
        if (url.includes('/api/computations/'))
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'not_found', message: 'No such recorded calculation.' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        return json({});
      }),
    );

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/figures/nothing-here']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    );

    /*
     * A wrong address and a failed connection are different things and must
     * not read the same. One is the reader's mistake and is recoverable by
     * going back; the other is ours and is recoverable by trying again. A
     * single "could not load" for both sends somebody hunting for a typo in
     * a link that was right.
     */
    await screen.findByText(/no such calculation/i, {}, { timeout: 4000 });
    expect(screen.queryByText(/could not load/i)).toBeNull();
  });
});
