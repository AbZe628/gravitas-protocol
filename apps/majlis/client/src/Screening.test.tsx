import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Screening from './components/Screening.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The panel computes and never concludes.
 *
 * What is worth testing is not that the numbers appear. It is that the
 * arithmetic appears instead of a verdict, that the sentence saying so travels
 * from the server rather than being written here, and that a ratio which could
 * not be computed is not quietly reported as a failure.
 */

const ratio = (over: Record<string, unknown> = {}) => ({
  key: 'debt',
  label: 'Interest-bearing debt to market capitalisation',
  numerator: '310000',
  denominator: '1000000',
  valueBps: 3100,
  percent: '31.00',
  withinThreshold: false,
  workings: '310000 ÷ 1000000 = 31.00%, against a limit of ≤ 30%. Outside the threshold.',
  authority: 'AAOIFI Shariah Standard No. 21',
  ...over,
});

const NOTE =
  'These are arithmetic facts about the figures supplied. Whether the instrument is permissible ' +
  'is a ruling for the board, and no ratio answers it — the business activity itself is a ' +
  'separate question entirely.';

function stub(ratios: unknown[], fail?: { status: number; body: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      fail
        ? new Response(JSON.stringify(fail.body), {
            status: fail.status,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(
            JSON.stringify({
              assessment: { asOf: '2026-06-30', source: 'Treasury', currency: 'USD', ratios, allWithinThresholds: false, note: NOTE },
              crossings: [],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
    ),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <Screening />
    </I18nProvider>,
  );

/** Open the panel and submit, which is the whole interaction. */
async function compute() {
  show();
  fireEvent.click(screen.getByRole('button', { name: /Work out the screening ratios/ }));
  fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));
}

afterEach(() => vi.unstubAllGlobals());

describe('it shows the sum, not the answer', () => {
  it('prints the division a scholar can check', async () => {
    stub([ratio()]);
    await compute();

    await waitFor(() =>
      expect(screen.getByText(/310000 ÷ 1000000 = 31\.00%/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/against a limit of ≤ 30%/)).toBeInTheDocument();
  });

  it('carries the server’s own sentence rather than one written here', async () => {
    stub([ratio()]);
    await compute();
    await waitFor(() => expect(screen.getByText(NOTE)).toBeInTheDocument());
  });

  it('never uses a word that reads as a verdict', async () => {
    stub([
      ratio(),
      ratio({ key: 'liquidity', label: 'Cash', percent: '20.00', withinThreshold: true, workings: '200000 ÷ 1000000 = 20.00%, against a limit of < 30%. Within the threshold.' }),
    ]);
    await compute();

    // The figure appears twice on purpose: once as the headline percentage and
    // once inside the workings. Both are wanted, so this asserts presence
    // rather than a single match.
    await waitFor(() => expect(screen.getAllByText(/20\.00%/).length).toBeGreaterThan(0));
    const text = document.body.textContent ?? '';
    for (const word of ['halal', 'haram', 'compliant', 'approved', 'fails', 'passes']) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  });

  it('shows a ratio it could not compute as neither within nor outside', async () => {
    stub([
      ratio({
        percent: null,
        withinThreshold: null,
        workings: 'market capitalisation is 0 USD. The ratio cannot be computed, and no threshold has been tested.',
      }),
    ]);
    await compute();

    await waitFor(() => expect(screen.getByText(/cannot be computed/)).toBeInTheDocument());
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('names the field the server refused rather than apologising', async () => {
    stub([], { status: 400, body: { error: 'bad_figure', field: 'marketCapitalisation', message: '"about four billion" is not a plain decimal figure.' } });
    await compute();

    await waitFor(() =>
      expect(screen.getByText(/is not a plain decimal figure/)).toBeInTheDocument(),
    );
  });

  it('stays out of the way until it is asked for', () => {
    stub([ratio()]);
    show();
    expect(screen.queryByRole('button', { name: /Work it out/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Work out the screening ratios/ })).toBeInTheDocument();
  });
});
