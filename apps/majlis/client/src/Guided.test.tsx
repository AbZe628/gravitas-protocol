import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * Simple, with nothing lost.
 *
 * Two guarantees, and they pull against each other, which is why they are
 * tested together. **One thing asks to be done at a time** — that is the whole
 * of the simplification. And **nothing was removed** — every panel, page and
 * refusal is still reachable, one link away, unchanged.
 *
 * A test suite that held only the first would pass on an application that had
 * thrown away half its function.
 */

const ATTENTION = {
  scholarId: 'member-a',
  role: 'signatory',
  office: null,
  outstanding: 2,
  overdue: 1,
  items: [
    {
      matterId: 'm-late',
      boardId: 'b',
      title: 'A ratification that has run out',
      status: 'timelock',
      direction: 'restrict',
      kind: 'awaiting_ratification',
      deadline: '2026-09-01T00:00:00.000Z',
      hoursRemaining: -48,
      overdue: true,
      note: 'The window has closed and the restriction will lapse without it.',
    },
    {
      matterId: 'm-vote',
      boardId: 'b',
      title: 'Approval of a commodity murabaha',
      status: 'voting',
      direction: 'permit',
      kind: 'awaiting_your_vote',
      deadline: '2026-09-06T00:00:00.000Z',
      hoursRemaining: 4,
      overdue: false,
      note: 'Your position has not been recorded.',
    },
  ],
};

function stub(over: Record<string, unknown> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/health')) return json({ ok: true, stage: 2, assistantKind: 'off' });
      if (url.includes('/api/attention')) return json({ ...ATTENTION, ...over });

      /*
       * A list where a list is expected. The pages behind the drawer read
       * arrays and map over them, and an object would crash the subtree —
       * which is what an empty body in these tests turned out to mean.
       */
      if (/\/(rules|boards|matters|briefings|log)$/.test(new URL(url, 'http://x').pathname)) {
        return json([]);
      }
      return json({});
    }),
  );
}

const show = (route = '/') =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('one thing asks to be done', () => {
  it('leads with the overdue one, whatever order the server sent', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText('A ratification that has run out')).toBeInTheDocument());

    // The overdue item is first on the page even though the vote is sooner in
    // hours: something past its deadline is not competing with something due.
    const late = screen.getByText('A ratification that has run out');
    const vote = screen.getByText('Approval of a commodity murabaha');
    expect(late.compareDocumentPosition(vote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers one control, and lists the rest without any', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/Open it/)).toBeInTheDocument());

    /*
     * A second button beside the first is two things asking to be done, which
     * is the state this screen exists to remove. The rest are links to read,
     * not controls to press.
     */
    expect(screen.getAllByText(/Open it/)).toHaveLength(1);
  });

  it('does not put the vote on the card', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/Open it/)).toBeInTheDocument());

    /*
     * A position carries the hash of the exact terms it was cast on. Voting
     * from a summary is voting on a headline, and the honest answer to a
     * regulator afterwards would be that the member approved a notification.
     */
    for (const forbidden of [/^I approve$/i, /^Approve$/i, /^Against$/i, /^Abstain$/i]) {
      expect(screen.queryByRole('button', { name: forbidden })).toBeNull();
    }
  });

  it('shows no navigation over it', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/Open it/)).toBeInTheDocument());

    // Twelve items under a page whose point is that one thing needs you
    // contradicts the page.
    expect(screen.queryByRole('link', { name: 'Register' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Library' })).toBeNull();
  });

  it('says nothing waiting as an answer rather than a blank', async () => {
    stub({ items: [], outstanding: 0, overdue: 0 });
    show();

    await waitFor(() => expect(screen.getByText(/The board is clear/)).toBeInTheDocument());
    expect(screen.getByText(/that is an answer, not an empty page/)).toBeInTheDocument();
  });
});

describe('nothing was removed', () => {
  it('reaches every other screen from one link', async () => {
    stub();
    show('/more');

    await waitFor(() => expect(screen.getByText('Everything else')).toBeInTheDocument());

    // getAllBy rather than getBy: each entry carries a sentence saying what it
    // is for, and some of those sentences name the thing too.
    for (const label of ['Register', 'Library', 'what stands', 'Search', 'Meetings', 'Board']) {
      expect(
        screen.getAllByRole('link', { name: new RegExp(label) }).length,
        `${label} is not reachable from here`,
      ).toBeGreaterThan(0);
    }
  });

  it('groups them, because the names alone taught nobody', async () => {
    stub();
    show('/more');

    await waitFor(() => expect(screen.getByText('What we decided')).toBeInTheDocument());
    expect(screen.getByText('What we hold')).toBeInTheDocument();
    expect(screen.getByText('Working something out')).toBeInTheDocument();
    expect(screen.getByText('The board itself')).toBeInTheDocument();
  });

  it('leaves out a page this installation cannot honour', async () => {
    stub();
    show('/more');

    // The assistant is off here, so it is absent rather than listed and
    // refusing — the same rule as every other control.
    await waitFor(() => expect(screen.getByText('Everything else')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Assistant/ })).toBeNull();
  });

  it('says plainly that nothing was taken off the first screen', async () => {
    stub();
    show('/more');

    await waitFor(() =>
      expect(screen.getByText(/it was moved off it/)).toBeInTheDocument(),
    );
  });
});

describe('what we decided and what stands are one screen', () => {
  it('opens on the decisions, and reaches the rules in one press', async () => {
    stub();
    show('/record');

    await waitFor(() => expect(screen.getByRole('tab', { name: /What we decided/ })).toBeInTheDocument());

    // The decided one leads: a board arriving here is more often looking for a
    // decision it made than for the list of what is operative.
    expect(screen.getByRole('tab', { name: /What we decided/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /In force today/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('reaches the same screen from the rules path, because they were one question', async () => {
    stub();
    show('/rules');

    await waitFor(() => expect(screen.getByRole('tab', { name: /In force today/ })).toBeInTheDocument());
  });

  it('leaves each page reachable on its own', async () => {
    stub();
    const { unmount } = show('/classic/record');
    await waitFor(() => expect(screen.queryByRole('tab')).toBeNull());
    unmount();

    show('/classic/rules');
    // Unchanged and still there. The merge rearranged; it removed nothing.
    await waitFor(() => expect(screen.queryByRole('tab')).toBeNull());
  });
});
