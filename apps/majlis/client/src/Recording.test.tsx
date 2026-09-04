import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Recorded from './components/Recorded.js';
import RecordCalculation from './components/RecordCalculation.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * Noting a calculation, and reading what has been noted.
 *
 * Two things these hold to. **Noting is not approving**, and the sentence
 * saying so comes from the server and is shown before the panel offers to act.
 * And **a figure that was corrected or withdrawn stays visible**, because the
 * revision is the part an auditor is looking for.
 */

const MEANS =
  'This records that the board was shown these figures, from the source named, and that this ' +
  'arithmetic follows from them. It is not approval of the method.';

const show = (node: React.ReactNode) =>
  render(
    <I18nProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </I18nProvider>,
  );

const computation = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  kind: 'zakat',
  boardId: 'demo-board',
  assetId: null,
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  method: 'net_assets',
  methodStated: 'Zakatable assets less liabilities falling due within the year.',
  currency: 'AED',
  source: 'Audited financial statements',
  figures: { cash: '4000000' },
  headline: 'Due',
  amount: '200000',
  steps: [{ label: 'At 2.5%', working: '2.5% of 8000000', value: '200000 AED' }],
  note: 'Whether the base is the right one is not answered here.',
  recordedBy: 'member-a',
  recordedAt: '2027-01-15T09:00:00Z',
  supersedes: null,
  withdrawnAt: null,
  withdrawnBy: null,
  withdrawalReason: null,
  ...over,
});

const listing = (entries: unknown[]) => ({
  history: entries,
  standing: [],
  whatRecordingMeans: MEANS,
});

function stub(body: unknown) {
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

afterEach(() => vi.unstubAllGlobals());

const input = {
  kind: 'zakat' as const,
  method: 'net_assets',
  methodStated: 'Zakatable assets less what is owed within the year.',
  currency: 'AED',
  source: 'Audited financial statements',
  figures: { cash: '4000000' },
  headline: 'Due',
  amount: '200000',
  steps: [{ label: 'At 2.5%', working: '2.5% of 8000000', value: '200000 AED' }],
  note: 'Not answered here.',
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
};

describe('the panel says what recording means before it offers to do it', () => {
  it('shows the server’s sentence, not one written here', async () => {
    stub(listing([]));
    show(<RecordCalculation input={input} />);

    fireEvent.click(screen.getByRole('button', { name: /Note this against a period/ }));
    await waitFor(() => expect(screen.getByText(MEANS)).toBeInTheDocument());
  });

  it('asks for the period rather than assuming one', async () => {
    stub(listing([]));
    show(<RecordCalculation input={{ ...input, periodFrom: undefined, periodTo: undefined }} />);

    fireEvent.click(screen.getByRole('button', { name: /Note this against a period/ }));
    // Both ends, empty, waiting to be told.
    const dates = document.querySelectorAll('input[type="date"]');
    expect(dates).toHaveLength(2);
    for (const d of dates) expect(d).toHaveValue('');
  });

  it('does not ask which holding when the calculation is not about one', async () => {
    stub(listing([]));
    show(<RecordCalculation input={input} />);

    fireEvent.click(screen.getByRole('button', { name: /Note this against a period/ }));
    expect(screen.queryByText(/The holding it concerns/)).toBeNull();
  });

  it('asks which holding when it is', async () => {
    stub({ ...listing([]), assets: [], asOf: '', institutionId: null, counts: {}, neverExamined: 0, total: 0 });
    show(<RecordCalculation input={{ ...input, kind: 'purification' }} wantsHolding />);

    fireEvent.click(screen.getByRole('button', { name: /Note this against a period/ }));
    await waitFor(() => expect(screen.getByText(/The holding it concerns/)).toBeInTheDocument());
  });
});

describe('what happens after it is noted', () => {
  it('says it is in the record, and stops offering to note it again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body =
          typeof url === 'string' && url.includes('/api/boards')
            ? [{ id: 'demo-board' }]
            : { computation: computation(), whatRecordingMeans: MEANS };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
    show(<RecordCalculation input={input} />);

    fireEvent.click(screen.getByRole('button', { name: /Note this against a period/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Note it$/ }));

    await waitFor(() => expect(screen.getByText(/It is in the record/)).toBeInTheDocument());
    // The same figure cannot be noted twice by pressing again.
    expect(screen.queryByRole('button', { name: /^Note it$/ })).toBeNull();
  });

  it('shows a refusal in the server’s words rather than a red border', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (typeof url === 'string' && url.includes('/api/boards')) {
          return new Response(JSON.stringify([{ id: 'demo-board' }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            error: 'no_source',
            message:
              'A figure with no source is one somebody typed, and this one is going into the record.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    show(<RecordCalculation input={input} />);

    fireEvent.click(screen.getByRole('button', { name: /Note this against a period/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Note it$/ }));

    await waitFor(() =>
      expect(screen.getByText(/one somebody typed/)).toBeInTheDocument(),
    );
  });
});

describe('the history keeps the revisions, not only the survivor', () => {
  it('shows a standing figure with its period and source', async () => {
    stub(listing([{ computation: computation(), state: 'standing', replacedBy: null }]));
    show(<Recorded />);

    await waitFor(() => expect(screen.getByText('Standing')).toBeInTheDocument());
    expect(screen.getByText(/200000 AED/)).toBeInTheDocument();
    expect(screen.getByText(/Audited financial statements/)).toBeInTheDocument();
  });

  it('keeps a replaced figure and names what replaced it', async () => {
    stub(
      listing([
        { computation: computation(), state: 'superseded', replacedBy: 'c2abcdef-later' },
        { computation: computation({ id: 'c2', amount: '210000' }), state: 'standing', replacedBy: null },
      ]),
    );
    show(<Recorded />);

    await waitFor(() => expect(screen.getByText('Replaced')).toBeInTheDocument());
    // Both figures are on the page. The revision is the part worth reading.
    expect(screen.getByText(/200000 AED/)).toBeInTheDocument();
    expect(screen.getByText(/210000 AED/)).toBeInTheDocument();
  });

  it('shows a withdrawn figure with the reason and the name', async () => {
    stub(
      listing([
        {
          computation: computation({
            withdrawnAt: '2027-02-01T00:00:00Z',
            withdrawnBy: 'member-b',
            withdrawalReason: 'Recorded against the wrong holding.',
          }),
          state: 'withdrawn',
          replacedBy: null,
        },
      ]),
    );
    show(<Recorded />);

    await waitFor(() => expect(screen.getByText('Withdrawn')).toBeInTheDocument());
    // A figure that left the record without a reason and a name is one that vanished.
    expect(screen.getByText(/Recorded against the wrong holding/)).toBeInTheDocument();
    expect(screen.getByText(/member-b/)).toBeInTheDocument();
  });

  it('shows the working on request, and the note with it', async () => {
    stub(listing([{ computation: computation(), state: 'standing', replacedBy: null }]));
    show(<Recorded />);

    await waitFor(() => screen.getByText('Standing'));
    fireEvent.click(screen.getByRole('button', { name: /Show the working/ }));

    expect(screen.getByText('2.5% of 8000000')).toBeInTheDocument();
    expect(screen.getByText(/not answered here/)).toBeInTheDocument();
  });

  it('carries the sentence saying noting is not approving', async () => {
    stub(listing([{ computation: computation(), state: 'standing', replacedBy: null }]));
    show(<Recorded />);

    await waitFor(() => expect(screen.getByText(MEANS)).toBeInTheDocument());
  });

  it('says plainly when nothing has been noted', async () => {
    stub(listing([]));
    show(<Recorded />);
    await waitFor(() => expect(screen.getByText(/Nothing has been noted yet/)).toBeInTheDocument());
  });

  it('does not crash on a payload that is not a listing', async () => {
    stub([]);
    const { container } = show(<Recorded />);
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });

  it('reaches no verdict anywhere', async () => {
    stub(listing([{ computation: computation(), state: 'standing', replacedBy: null }]));
    show(<Recorded />);

    await waitFor(() => screen.getByText('Standing'));
    const text = (document.body.textContent ?? '').toLowerCase();
    for (const claim of ['halal', 'haram', 'is compliant', 'approved by the board']) {
      expect(text).not.toContain(claim);
    }
  });
});
