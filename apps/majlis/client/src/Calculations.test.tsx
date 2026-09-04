import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Calculations from './pages/Calculations.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The screens that let a board do arithmetic on its own figures.
 *
 * What these hold to is the one thing the whole surface exists to protect: it
 * computes and it never concludes, and where a choice between methods is a
 * ruling, the interface has not made it.
 */

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Calculations />
      </MemoryRouter>
    </I18nProvider>,
  );

function ok(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
}

function refuse(error: string, message: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error, message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
}

const zakat = {
  method: 'net_assets',
  methodStated: 'Zakatable assets less liabilities falling due within the year.',
  year: 'lunar',
  rateStated: '2.5%',
  rateWhy: 'The year is lunar, so the ordinary rate applies.',
  borneBy: 'shareholders',
  borneByStated:
    'The shareholders pay it. The institution computes and discloses the figure and discharges nothing by doing so.',
  hawlEndsOn: '2026-12-31',
  currency: 'AED',
  source: 'Audited financial statements',
  base: '8000000',
  due: '200000',
  baseIsNegative: false,
  steps: [
    { label: 'Zakatable assets', working: 'Added', value: '10000000 AED' },
    { label: 'At 2.5%', working: '2.5% of 8000000', value: '200000 AED' },
  ],
  note: 'Whether the base is the right one is not answered here.',
};

const purified = {
  method: 'per_dividend',
  methodStated: 'The company’s non-permissible income as a proportion of its total income.',
  basis: 'Income only, gross',
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  currency: 'USD',
  source: 'Issuer annual report',
  amount: '800',
  perUnit: '0.08',
  proportionOfReceiptsBps: 320,
  steps: [{ label: 'Proportion', working: '3200000 ÷ 100000000', value: '3.20%' }],
  note: 'Which method applies is the board’s to decide.',
};

afterEach(() => vi.unstubAllGlobals());

describe('it has not chosen a method, and does not ask for figures until the board has', () => {
  it('offers the two zakat bases and asks for nothing yet', async () => {
    show();
    fireEvent.click(screen.getByRole('tab', { name: /Zakat/ }));

    expect(screen.getByText('Net assets')).toBeInTheDocument();
    expect(screen.getByText('Net invested funds')).toBeInTheDocument();
    // No radio is pre-selected: choosing between them is a ruling.
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    // And no money field until one is chosen.
    expect(screen.queryByText('Cash')).toBeNull();
  });

  it('says on the option what the base means, not only what it is called', async () => {
    show();
    fireEvent.click(screen.getByRole('tab', { name: /Zakat/ }));

    expect(screen.getByText(/less liabilities falling due within the year/)).toBeInTheDocument();
    expect(screen.getByText(/less fixed assets, long-term investments/)).toBeInTheDocument();
  });

  it('asks for the figures the chosen base wants, and not the other ones', async () => {
    show();
    fireEvent.click(screen.getByRole('tab', { name: /Zakat/ }));

    fireEvent.click(screen.getByText('Net assets'));
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.queryByText('Paid-up capital')).toBeNull();

    fireEvent.click(screen.getByText('Net invested funds'));
    expect(screen.getByText('Paid-up capital')).toBeInTheDocument();
    expect(screen.queryByText('Cash')).toBeNull();
  });

  it('does the same for the three purification methods', async () => {
    show();
    fireEvent.click(screen.getByRole('tab', { name: /Purification/ }));

    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(screen.queryByText('Units held')).toBeNull();

    fireEvent.click(screen.getByText('Per unit'));
    expect(screen.getByText('Published rate per unit')).toBeInTheDocument();
    // per_unit takes no receipts and no share count.
    expect(screen.queryByText('Shares in issue')).toBeNull();
    expect(screen.queryByText('Income received')).toBeNull();
  });
});

describe('the result is the working, and the server’s own sentences', () => {
  it('shows every sum beside the figure', async () => {
    ok(zakat);
    show();

    fireEvent.click(screen.getByRole('tab', { name: /Zakat/ }));
    fireEvent.click(screen.getByText('Net assets'));
    fireEvent.click(screen.getByText('Lunar'));
    fireEvent.click(screen.getByText('The shareholders'));
    fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));

    // Twice on purpose: once as the headline, once as the last step. A figure
    // is never shown without the sum that produced it.
    await waitFor(() => expect(screen.getAllByText(/200000 AED/)).toHaveLength(2));
    expect(screen.getByText('2.5% of 8000000')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeInTheDocument();
  });

  it('prints whose obligation it is beside the figure, not behind it', async () => {
    ok(zakat);
    show();

    fireEvent.click(screen.getByRole('tab', { name: /Zakat/ }));
    fireEvent.click(screen.getByText('Net assets'));
    fireEvent.click(screen.getByText('Lunar'));
    fireEvent.click(screen.getByText('The shareholders'));
    fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));

    await waitFor(() =>
      expect(screen.getByText(/discharges nothing by doing so/)).toBeInTheDocument(),
    );
  });

  it('carries the note as the server wrote it', async () => {
    ok(purified);
    show();

    fireEvent.click(screen.getByRole('tab', { name: /Purification/ }));
    fireEvent.click(screen.getByText('Per dividend'));
    fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));

    await waitFor(() => expect(screen.getByText(purified.note)).toBeInTheDocument());
  });

  it('states no verdict anywhere on the result', async () => {
    ok(zakat);
    show();

    fireEvent.click(screen.getByRole('tab', { name: /Zakat/ }));
    fireEvent.click(screen.getByText('Net assets'));
    fireEvent.click(screen.getByText('Lunar'));
    fireEvent.click(screen.getByText('The institution'));
    fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));

    await waitFor(() => expect(screen.getAllByText(/200000 AED/).length).toBeGreaterThan(0));
    const text = (document.body.textContent ?? '').toLowerCase();
    for (const claim of ['halal', 'haram', 'is compliant', 'obligation discharged', 'therefore']) {
      expect(text).not.toContain(claim);
    }
  });
});

describe('a refusal is shown in the server’s words, because that is the teaching', () => {
  it('prints the sentence about a missing figure rather than a red border', async () => {
    refuse(
      'no_reason_given',
      'A missing figure is not a zero: a zakat computed around a gap understates an obligation nobody checked.',
    );
    show();

    fireEvent.click(screen.getByRole('tab', { name: /Zakat/ }));
    fireEvent.click(screen.getByText('Net assets'));
    fireEvent.click(screen.getByText('Lunar'));
    fireEvent.click(screen.getByText('The institution'));
    fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));

    await waitFor(() =>
      expect(screen.getByText(/understates an obligation nobody checked/)).toBeInTheDocument(),
    );
  });

  it('clears the previous figure rather than leaving it beside the refusal', async () => {
    ok(zakat);
    show();

    fireEvent.click(screen.getByRole('tab', { name: /Zakat/ }));
    fireEvent.click(screen.getByText('Net assets'));
    fireEvent.click(screen.getByText('Lunar'));
    fireEvent.click(screen.getByText('The institution'));
    fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));
    await waitFor(() => expect(screen.getAllByText(/200000 AED/).length).toBeGreaterThan(0));

    vi.unstubAllGlobals();
    refuse('bad_figure', '"about four million" is not a plain decimal figure.');
    fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));

    await waitFor(() => expect(screen.getByText(/not a plain decimal figure/)).toBeInTheDocument());
    // The old answer was computed from figures that have since changed.
    expect(screen.queryAllByText(/200000 AED/)).toHaveLength(0);
  });
});

describe('what the page says about itself', () => {
  it('says nothing computed here is recorded, on the page rather than after it', () => {
    show();
    expect(screen.getByText(/Nothing computed on this page is recorded/)).toBeInTheDocument();
  });

  it('offers all four calculations, screening included', () => {
    show();
    for (const name of [/Screening/, /Purification/, /Zakat/, /Profit distribution/]) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
  });

  it('names the order the reserves come out in, which is the whole model', async () => {
    show();
    fireEvent.click(screen.getByRole('tab', { name: /Profit distribution/ }));

    expect(screen.getByText(/before the split. Both the bank and the depositors bear it/)).toBeInTheDocument();
    expect(screen.getByText(/after the split, from the depositors’ share alone/)).toBeInTheDocument();
  });

  it('does not print the sign twice when smoothing lowered the payout', async () => {
    ok({
      periodFrom: '2026-01-01',
      periodTo: '2026-03-31',
      currency: 'AED',
      source: 'Treasury',
      method: 'PER before the split; IRR after it.',
      grossProfit: '1000000',
      distributableProfit: '950000',
      mudaribShare: '285000',
      depositorsShare: '665000',
      paidToDepositors: '651700',
      reserves: [],
      steps: [{ label: 'Paid to depositors', working: '665000 − 13300', value: '651700 AED' }],
      smoothing: {
        withoutSmoothing: '700000',
        paid: '651700',
        difference: '-48300',
        direction: 'lowered',
        rateWithoutSmoothingBps: null,
        ratePaidBps: null,
        note: 'The reserves lowered the payout.',
      },
      note: 'Matters for the board.',
    });
    show();

    fireEvent.click(screen.getByRole('tab', { name: /Profit distribution/ }));
    fireEvent.click(screen.getByRole('button', { name: /Work it out/ }));

    // "lowered by -48300" is a double negative: the word already carries it.
    await waitFor(() => expect(screen.getByText(/lowered by/)).toBeInTheDocument());
    expect(screen.getByText(/lowered by/).textContent).toContain('48300');
    expect(screen.getByText(/lowered by/).textContent).not.toContain('-48300');
  });

  it('has no default deduction rate, because a default is a decision about returns', async () => {
    show();
    fireEvent.click(screen.getByRole('tab', { name: /Profit distribution/ }));

    for (const box of screen.getAllByPlaceholderText('0.00')) {
      expect(box).toHaveValue('');
    }
  });
});
