import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pace from './components/Pace.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The one figure in this application that measures the board rather than its
 * decisions.
 *
 * What these hold to is that it never states more than it knows: a decimal it
 * cannot justify, a range with identical ends, or a figure at all when the
 * request failed.
 */

interface BoardPace {
  boardId: string;
  settled: number;
  medianDays: number | null;
  fastestDays: number | null;
  slowestDays: number | null;
  open: number;
  longestOpen: unknown;
  approximate: boolean;
}

const board = (over: Partial<BoardPace> = {}): BoardPace => ({
  boardId: 'demo-board',
  settled: 3,
  medianDays: 7.4,
  fastestDays: 2.1,
  slowestDays: 19.6,
  open: 2,
  longestOpen: null,
  approximate: false,
  ...over,
});

function stub(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      ok
        ? new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : new Response('no', { status: 500 }),
    ),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Pace />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('it states no more than it knows', () => {
  it('rounds to whole days rather than showing a tenth it cannot justify', async () => {
    stub({ asOf: 'x', boards: [board()], waiting: [] });
    show();

    await waitFor(() => expect(screen.getByText(/7 days/)).toBeInTheDocument());
    expect(screen.queryByText(/7\.4/)).toBeNull();
  });

  it('says "under a day" instead of rounding a fast board to zero', async () => {
    stub({ asOf: 'x', boards: [board({ medianDays: 0.6 })], waiting: [] });
    show();

    await waitFor(() => expect(screen.getByText(/under a day/)).toBeInTheDocument());
    expect(screen.queryByText(/\b0 days/)).toBeNull();
  });

  it('shows a range only when its ends differ', async () => {
    stub({ asOf: 'x', boards: [board()], waiting: [] });
    const { unmount } = show();
    await waitFor(() => expect(screen.getByText(/2–20 days/)).toBeInTheDocument());
    unmount();

    stub({ asOf: 'x', boards: [board({ settled: 1, fastestDays: 76, slowestDays: 76, medianDays: 76 })], waiting: [] });
    show();
    await waitFor(() => expect(screen.getByText(/76 days/)).toBeInTheDocument());
    expect(screen.queryByText(/76–76/)).toBeNull();
  });

  it('admits when the figures cover only part of the wait', async () => {
    stub({ asOf: 'x', boards: [board({ approximate: true })], waiting: [] });
    show();
    await waitFor(() => expect(screen.getByText(/reached this system/)).toBeInTheDocument());
  });

  it('says nothing at all when it cannot be worked out, rather than zero', async () => {
    stub(null, false);
    const { container } = show();
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });

  it('stays out of the way of a board that has decided nothing', async () => {
    stub({ asOf: 'x', boards: [board({ settled: 0, medianDays: null, open: 0 })], waiting: [] });
    const { container } = show();
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });

  it('links the longest wait to the matter and not to a member', async () => {
    stub({
      asOf: 'x',
      boards: [
        board({
          longestOpen: { matterId: 'm9', title: 'A slow question', days: 43.7, phase: 'voting', waitingOn: ['member-b'] },
        }),
      ],
      waiting: [],
    });
    show();

    await waitFor(() => expect(screen.getByText('A slow question')).toBeInTheDocument());
    expect(screen.getByText('A slow question').closest('a')).toHaveAttribute('href', '/matters/m9');
    expect(screen.queryByText(/member-b/)).toBeNull();
  });
});
