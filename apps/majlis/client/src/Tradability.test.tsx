import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Tradability from './components/Tradability.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The tradability screen, and the permission it does not give.
 *
 * The other three calculation screens ask for figures. This one asks for a
 * **rule**, and the two things worth testing follow from that: nothing about
 * the board's rule is chosen for them, and what comes back is shown as the
 * board's own sentence rather than as this application's finding.
 */

const RESULT = {
  asOf: '2026-07-01',
  source: 'Trustee composition report, 1 July 2026',
  authority: 'Board resolution of 12 March 2026',
  countsAsTangible: ['tangible'],
  byKind: [
    { kind: 'tangible', bps: 5400, percent: '54.00' },
    { kind: 'debt', bps: 0, percent: '0.00' },
    { kind: 'cash', bps: 1000, percent: '10.00' },
    { kind: 'receivable', bps: 3600, percent: '36.00' },
    { kind: 'other', bps: 0, percent: '0.00' },
  ],
  countedBps: 5400,
  countedPercent: '54.00',
  // Nullable on purpose: `band: null` is the shape the server sends where the
  // board's rule does not reach the composition, and the overrides below have
  // to be able to send it.
  band: {
    fromBps: 5100,
    toBps: 10_000,
    consequence: 'May be traded at a negotiated price, provided the trustee certifies the lease is on foot.',
  } as { fromBps: number; toBps: number; consequence: string } | null,
  unstated: null as string | null,
  steps: [{ label: 'Counted on the tangible side', working: 'tangible 5400 = 5400 of 10000', value: '54.00%' }],
  alsoGovernedBy: [] as string[],
  note: 'This states a proportion and repeats the sentence this board wrote about it.',
};

function ok(over: Partial<typeof RESULT> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ ...RESULT, ...over }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Tradability />
      </MemoryRouter>
    </I18nProvider>,
  );

const submit = () => fireEvent.click(screen.getByRole('button', { name: /Work it out/i }));

afterEach(() => vi.unstubAllGlobals());

describe('nothing about the board’s rule is chosen for them', () => {
  it('counts nothing on the tangible side until a box is ticked', () => {
    ok();
    show();

    // Reading `tangible` off the label and counting it would be this
    // application settling a classification question that belongs to the board.
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.length).toBe(5);
    expect(boxes.every((b) => !(b as HTMLInputElement).checked)).toBe(true);
  });

  it('offers no default consequence, only an example placed as one', () => {
    ok();
    show();

    const consequence = screen.getByLabelText(/What the board said happens/i);
    expect((consequence as HTMLTextAreaElement).value).toBe('');
    // A placeholder is an example of the shape, not a sentence anybody wrote.
    expect(consequence).toHaveAttribute('placeholder');
  });

  it('names every kind rather than assuming the pool has only two', () => {
    ok();
    show();

    for (const kind of ['Tangible', 'Debt', 'Cash', 'Receivable', 'Other']) {
      expect(screen.getAllByText(kind).length).toBeGreaterThan(0);
    }
  });
});

describe('the composition has to add up, and the form says so while it is typed', () => {
  it('names what is not described rather than waiting to refuse', () => {
    ok();
    show();

    fireEvent.change(screen.getByLabelText('Part'), { target: { value: 'Leased aircraft' } });
    fireEvent.change(screen.getByLabelText(/Share/), { target: { value: '54' } });

    // The person entering the composition is the person who can say what the
    // missing 46% is. Telling them now beats refusing them later.
    expect(screen.getByText(/46.00% of the pool is not described/)).toBeInTheDocument();
  });

  it('says so when the parts overshoot the whole as well', () => {
    ok();
    show();

    fireEvent.change(screen.getByLabelText(/Share/), { target: { value: '140' } });

    expect(screen.getByText(/40.00% more than the whole/)).toBeInTheDocument();
  });
});

describe('the answer is shown as the board’s sentence, not as a finding', () => {
  it('quotes the consequence and attributes it to the resolution', async () => {
    ok();
    show();
    submit();

    await waitFor(() =>
      expect(
        screen.getByText(/May be traded at a negotiated price, provided the trustee certifies/),
      ).toBeInTheDocument(),
    );

    // In the board's voice, and said to be the board's.
    expect(screen.getByText(/Board resolution of 12 March 2026/)).toBeInTheDocument();
    expect(screen.getByText(/The band from 51.00% to 100.00%/)).toBeInTheDocument();
  });

  it('shows the proportion with the sums under it', async () => {
    ok();
    show();
    submit();

    // Twice over: the figure, and the working underneath it. A number with no
    // sums under it is something a board is asked to accept.
    await waitFor(() => expect(screen.getAllByText('54.00%').length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText(/tangible 5400 = 5400 of 10000/)).toBeInTheDocument();
  });

  it('carries the note that says what was not answered', async () => {
    ok();
    show();
    submit();

    await waitFor(() => expect(screen.getByText(RESULT.note)).toBeInTheDocument());
  });

  it('marks which kinds were counted, so the classification is visible in the answer', async () => {
    ok();
    show();
    submit();

    await waitFor(() => expect(screen.getByText('counted')).toBeInTheDocument());
  });
});

describe('where the board’s rule does not reach the composition', () => {
  const gap =
    'The counted proportion is 30.00%. This board’s rule describes 51.00%–100.00%, and says nothing ' +
    'about where this composition falls. That is a hole in the rule rather than an answer.';

  it('shows the gap where the answer would have been', async () => {
    ok({ band: null, unstated: gap, countedPercent: '30.00' });
    show();
    submit();

    await waitFor(() => expect(screen.getByText(/hole in the rule rather than an answer/)).toBeInTheDocument());
  });

  it('quotes nothing, because there is no sentence to quote', async () => {
    ok({ band: null, unstated: gap, countedPercent: '30.00' });
    show();
    submit();

    await waitFor(() => expect(screen.getByText(/hole in the rule/)).toBeInTheDocument());
    // Not rounded into the nearest band. No consequence is shown at all.
    expect(screen.queryByText(/May be traded/)).toBeNull();
  });

  it('still shows the arithmetic, because the sums are not what is missing', async () => {
    ok({ band: null, unstated: gap, countedPercent: '30.00' });
    show();
    submit();

    await waitFor(() => expect(screen.getByText('30.00%')).toBeInTheDocument());
    expect(screen.getByText(/tangible 5400 = 5400 of 10000/)).toBeInTheDocument();
  });
});

describe('what governs a pool whatever the proportion says', () => {
  it('shows the standard beside the band rather than instead of it', async () => {
    ok({
      alsoGovernedBy: [
        'This composition is entirely debt and receivables. Its exchange is governed by AAOIFI SS-59.',
      ],
    });
    show();
    submit();

    await waitFor(() => expect(screen.getByText(/AAOIFI SS-59/)).toBeInTheDocument());
    // Beside, not instead. The board's own sentence still stands.
    expect(screen.getByText(/May be traded at a negotiated price/)).toBeInTheDocument();
  });

  it('shows nothing of the kind for a mixed pool', async () => {
    ok();
    show();
    submit();

    await waitFor(() => expect(screen.getAllByText('54.00%').length).toBeGreaterThan(0));
    expect(screen.queryByText(/AAOIFI SS-59/)).toBeNull();
  });
});
