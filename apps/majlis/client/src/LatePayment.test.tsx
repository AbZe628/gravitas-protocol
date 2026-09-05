import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LatePayment from './components/LatePayment.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The late payment screen, and the amount that may not stay.
 *
 * The arithmetic is a multiplication. What a screen could get wrong is the
 * destination, and there are exactly two ways: by making retention look like a
 * default, and by letting the debtor's position go unasked. Both are what these
 * hold.
 */

const RESULT = {
  method: 'stipulated_amount',
  methodStated: 'The amount is the figure the contract names, applied as it stands.',
  currency: 'AED',
  source: 'Collections ledger, entry 4471',
  obligation: 'Murabaha instalment 7 of 24',
  dueOn: '2026-04-01',
  paidOn: '2026-07-01',
  daysLate: 91,
  solvency: 'able_and_delaying',
  solvencyStated: 'The board established that this debtor was able to pay and delayed.',
  solvencyWarning: null as string | null,
  retention: 'nothing',
  retentionStated: 'This board permits the institution to retain nothing.',
  charged: '5000',
  retained: '0',
  toBeGivenAway: '5000',
  steps: [{ label: 'Days late', working: '2026-04-01 to 2026-07-01', value: '91' }],
  note: 'An increase taken for the passage of time does not become income by being received.',
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
        <LatePayment />
      </MemoryRouter>
    </I18nProvider>,
  );

/** Answer the two rulings, pick a method, and work it out. */
function fillAndSubmit() {
  fireEvent.click(screen.getByText('Able to pay, and delayed'));
  fireEvent.click(screen.getByText('The amount the contract names'));
  fireEvent.click(screen.getByText('Nothing'));
  fireEvent.click(screen.getByRole('button', { name: /Work it out/i }));
}

afterEach(() => vi.unstubAllGlobals());

describe('the two rulings are asked, and neither is pre-answered', () => {
  it('asks about the debtor before it asks for any figure', () => {
    ok();
    show();

    // Whether a charge may be taken at all turns on this. A form that reached
    // it after the arithmetic would have treated it as a detail.
    expect(screen.getByText(/What the board established about the debtor/i)).toBeInTheDocument();
    // No amount field until a method is chosen.
    expect(screen.queryByText('Amount stipulated')).toBeNull();
  });

  it('selects no answer about the debtor for them', () => {
    ok();
    show();

    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBeGreaterThanOrEqual(3);
    expect(radios.every((r) => !(r as HTMLInputElement).checked)).toBe(true);
  });

  it('offers all three answers, including that nobody determined it', () => {
    ok();
    show();

    expect(screen.getByText('Able to pay, and delayed')).toBeInTheDocument();
    expect(screen.getByText('Unable to pay')).toBeInTheDocument();
    // Recorded as unanswered rather than treated as delay.
    expect(screen.getByText('Not determined')).toBeInTheDocument();
  });

  it('does not start on letting the institution keep the costs', () => {
    ok();
    show();
    fireEvent.click(screen.getByText('Able to pay, and delayed'));
    fireEvent.click(screen.getByText('The amount the contract names'));

    const nothing = screen.getByText('Nothing').closest('label')?.querySelector('input');
    const costs = screen.getByText('Evidenced collection cost').closest('label')?.querySelector('input');
    expect((nothing as HTMLInputElement).checked).toBe(false);
    expect((costs as HTMLInputElement).checked).toBe(false);
  });

  it('asks the day count only where a rate makes it matter, and does not default it', () => {
    ok();
    show();
    fireEvent.click(screen.getByText('Able to pay, and delayed'));
    expect(screen.queryByText('360')).toBeNull();

    fireEvent.click(screen.getByText('A rate on what was outstanding'));
    // 360 and 365 give different answers on the same debt.
    expect(screen.getByText('360')).toBeInTheDocument();
    expect(screen.getByText('365')).toBeInTheDocument();
  });
});

describe('the destination is the headline', () => {
  it('leads with what leaves, not with what was charged', async () => {
    ok();
    show();
    fillAndSubmit();

    await waitFor(() => expect(screen.getByText('To be given away')).toBeInTheDocument());
    expect(screen.getByText('5000 AED')).toBeInTheDocument();
  });

  it('shows the charge and the retained amount underneath it', async () => {
    ok({ retention: 'evidenced_costs', retained: '1200', toBeGivenAway: '3800' });
    show();
    fillAndSubmit();

    await waitFor(() => expect(screen.getByText('3800 AED')).toBeInTheDocument());
    expect(screen.getByText('Charged')).toBeInTheDocument();
    expect(screen.getByText('Retained')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('prints the retention ruling with the figure rather than behind it', async () => {
    ok();
    show();
    fillAndSubmit();

    // This sentence is what stops a retained amount being read as revenue.
    await waitFor(() =>
      expect(screen.getByText(/permits the institution to retain nothing/)).toBeInTheDocument(),
    );
  });

  it('carries the note saying it does not become income by being received', async () => {
    ok();
    show();
    fillAndSubmit();

    await waitFor(() => expect(screen.getByText(RESULT.note)).toBeInTheDocument());
  });
});

describe('where the charge may not be due at all', () => {
  const warning =
    'A charge on a debtor who could not pay is the thing AAOIFI SS-3 forbids. They are not a ' +
    'finding that anything is due.';

  it('puts the warning above the amount rather than below it', async () => {
    ok({ solvency: 'unable', solvencyWarning: warning, solvencyStated: 'The board established that this debtor was unable to pay.' });
    show();
    fillAndSubmit();

    await waitFor(() => expect(screen.getByText(warning)).toBeInTheDocument());

    // Order on the page, not merely presence. The first thing to read.
    const shown = screen.getByText(warning);
    const amount = screen.getByText('5000 AED');
    expect(shown.compareDocumentPosition(amount) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('still shows the figure, because refusing would be a ruling', async () => {
    ok({ solvency: 'unable', solvencyWarning: warning });
    show();
    fillAndSubmit();

    // A board deciding what to permit needs the figure the contract would have
    // produced in front of it.
    await waitFor(() => expect(screen.getByText('5000 AED')).toBeInTheDocument());
  });

  it('shows no warning where the board established the debtor was delaying', async () => {
    ok();
    show();
    fillAndSubmit();

    await waitFor(() => expect(screen.getByText('5000 AED')).toBeInTheDocument());
    expect(screen.queryByText(/not a finding that anything is due/)).toBeNull();
    expect(screen.getByText(RESULT.solvencyStated)).toBeInTheDocument();
  });
});
