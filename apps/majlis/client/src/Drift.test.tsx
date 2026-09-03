import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DriftPanel, { DriftForAsset } from './components/Drift.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The panel reports something nobody asked it to look for. What these hold to
 * is that it reports and never concludes, and that it never appears to act.
 */

const QUESTION =
  'Mixed pool: tangible is 50.00%, against the 51.00% minimum this board set in ' +
  'matter-2026-04-02. Does the standing ruling still hold?';

const drift = (over: Record<string, unknown> = {}) => ({
  assetId: 'asset-mixed-pool',
  assetName: 'Mixed pool — leased equipment and trade finance',
  matterId: 'matter-2026-04-02',
  term: {
    key: 'minTangibleRatioBps',
    value: '5100',
    meaning: 'Tangible assets must be at least 51.00% of pool value.',
    bound: 'minimum',
  },
  observed: { kind: 'tangible', bps: 5000, percent: '50.00' },
  direction: 'into_breach',
  asOf: '2026-06-30T00:00:00Z',
  source: 'Pool net asset value breakdown',
  questionForBoard: QUESTION,
  ...over,
});

function stub(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ),
  );
}

const report = (over: Record<string, unknown> = {}) => ({
  asOf: 'x',
  drifting: [drift()],
  unwatched: [],
  unmeasured: [],
  ...over,
});

const show = (node: React.ReactNode) =>
  render(
    <I18nProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('it shows both figures and the server’s own words', () => {
  it('states what the holding reads beside what the board set', async () => {
    stub(report());
    show(<DriftPanel />);

    // Each figure appears twice on purpose: once as the headline pair and
    // once inside the question. Both are wanted.
    await waitFor(() => expect(screen.getAllByText(/50[.]00%/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/51[.]00%/).length).toBeGreaterThan(0);
  });

  it('prints the question exactly as the server wrote it', async () => {
    stub(report());
    show(<DriftPanel />);
    await waitFor(() => expect(screen.getByText(QUESTION)).toBeInTheDocument());
  });

  it('leads to the holding rather than doing anything', async () => {
    stub(report());
    show(<DriftPanel />);

    await waitFor(() => screen.getByText(QUESTION));
    const link = screen.getAllByText(/Mixed pool/)[0].closest('a');
    expect(link).toHaveAttribute('href', '/register/asset-mixed-pool');
    // Nothing on the panel writes.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('says which way the threshold was crossed', async () => {
    stub(report());
    show(<DriftPanel />);
    await waitFor(() => expect(screen.getByText(/Below the minimum set/)).toBeInTheDocument());

    vi.unstubAllGlobals();
    stub(report({ drifting: [drift({ term: { ...drift().term, bound: 'maximum' } })] }));
    show(<DriftPanel />);
    await waitFor(() => expect(screen.getByText(/Above the maximum set/)).toBeInTheDocument());
  });
});

describe('the thresholds nothing is checking are on the panel, not behind it', () => {
  it('shows them, because that is how a crossing goes unnoticed', async () => {
    stub(
      report({
        drifting: [],
        unwatched: [
          {
            assetId: 'asset-mixed-pool',
            matterId: 'm1',
            key: 'onBreach',
            reason: '"onBreach" does not say what part of a composition it is measured against, so nothing checks it.',
          },
        ],
      }),
    );
    show(<DriftPanel />);

    await waitFor(() => expect(screen.getByText(/Thresholds nothing is checking/)).toBeInTheDocument());
    // The key is named once as a link and once inside the reason.
    expect(screen.getAllByText(/onBreach/).length).toBeGreaterThan(0);
    // Not inside a disclosure that has to be opened.
    expect(document.querySelector('details')).toBeNull();
  });

  it('shows a watched term with no composition to check it against', async () => {
    stub(
      report({
        drifting: [],
        unmeasured: [
          { assetId: 'a1', assetName: 'A pool', reason: 'Nobody has supplied a composition, and the absence is the finding.' },
        ],
      }),
    );
    show(<DriftPanel />);
    await waitFor(() => expect(screen.getByText(/the absence is the finding/)).toBeInTheDocument());
  });
});

describe('when there is nothing to say it says nothing', () => {
  it('stays off the page entirely when nothing has moved', async () => {
    stub(report({ drifting: [], unwatched: [], unmeasured: [] }));
    const { container } = show(<DriftPanel />);
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing rather than something wrong when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    const { container } = show(<DriftPanel />);
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });

  it('does not crash on a payload that is not a report', async () => {
    stub([]);
    const { container } = show(<DriftPanel />);
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('on one holding', () => {
  it('names the decision whose term was crossed, and links to it', async () => {
    stub(report());
    show(<DriftForAsset assetId="asset-mixed-pool" />);

    await waitFor(() => expect(screen.getByText(/has moved under its ruling/)).toBeInTheDocument());
    expect(screen.getByText('matter-2026-04-02').closest('a')).toHaveAttribute(
      'href',
      '/matters/matter-2026-04-02',
    );
  });

  it('ignores drift on a different holding', async () => {
    stub(report());
    const { container } = show(<DriftForAsset assetId="asset-something-else" />);
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });

  it('states no verdict about the holding anywhere', async () => {
    stub(report());
    show(<DriftForAsset assetId="asset-mixed-pool" />);

    await waitFor(() => screen.getByText(/has moved under its ruling/));
    const text = (document.body.textContent ?? '').toLowerCase();
    for (const claim of ['impermissible', 'no longer permitted', 'must be withdrawn', 'therefore']) {
      expect(text).not.toContain(claim);
    }
  });
});
