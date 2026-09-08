import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('keeps the navigation grouped rather than a row of equal links', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/Open it/)).toBeInTheDocument());

    /*
     * The rail is the four doors, and it is headed by them.
     *
     * Hiding the navigation on this screen was right when it was twelve equal
     * links across the top. It is now the four phases a question travels
     * through, numbered, and a frame should be permanent: a reader learns
     * where the navigation lives once and stops thinking about it.
     *
     * The headings are asserted by their number as well as their name, so a
     * rail that lost the sequence — which is the information the numbers
     * carry — fails here rather than quietly becoming four unordered piles.
     */
    expect(screen.getByText(/01\s+Asked/)).toBeInTheDocument();
    expect(screen.getByText(/02\s+Deciding/)).toBeInTheDocument();
    expect(screen.getByText(/03\s+In force/)).toBeInTheDocument();
    expect(screen.getByText(/04\s+Checked/)).toBeInTheDocument();

    // Nothing was lost in the move: the register still has a way in.
    expect(screen.getAllByRole('link', { name: 'Holdings' }).length).toBeGreaterThan(0);
  });

  it('has no drawer called everything else', async () => {
    stub();
    show();
    await waitFor(() => expect(screen.getByText(/Open it/)).toBeInTheDocument());

    /*
     * The drawer is what this whole rearrangement was for.
     *
     * It held twelve links under four headings nobody had picked, it was four
     * screens tall, and it told a reader nothing about which of the twelve
     * they wanted. Every one of those destinations now sits under the phase
     * it belongs to. If a *more* link comes back, something has been given a
     * home nobody chose again.
     */
    expect(screen.queryByRole('link', { name: /everything else/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^More$/i })).toBeNull();
  });

  it('says nothing waiting as an answer rather than a blank', async () => {
    stub({ items: [], outstanding: 0, overdue: 0 });
    show();

    /*
     * Set large, in the display face, because for most people opening this it
     * is the whole of the first question's answer. The sentence that explained
     * that it was an answer rather than a blank has gone: it was explaining
     * what the typography now says.
     */
    await waitFor(() => expect(screen.getByText('Nothing is waiting for you today.')).toBeInTheDocument());
  });

  it('shows what the board is doing even when nothing needs anybody', async () => {
    stub({ items: [], outstanding: 0, overdue: 0 });
    show();

    /*
     * The screen that asked only what needs *you* was empty for an observer, an
     * auditor, and anybody looking before they have credentials — which is
     * everybody, the first time. A front page that says nothing is waiting and
     * stops has told a first-time reader there is nothing here.
     */
    await waitFor(() => expect(screen.getByText('How it works')).toBeInTheDocument());

    /*
     * Four rows, always, whoever is reading.
     *
     * These replaced three counters that were the three easiest to fetch
     * rather than the three that answered anything — one of them linked to a
     * page where the word it counted never appeared. Because these are the
     * four phases, the row a reader wants always exists.
     */
    for (const phase of ['Asked', 'Deciding', 'In force', 'Checked']) {
      expect(
        screen.getAllByText(phase).length,
        `the ${phase} row is missing from the arrival screen`,
      ).toBeGreaterThan(0);
    }
  });

  it('never writes a count and a noun that disagree', async () => {
    stub({ items: [], outstanding: 0, overdue: 0 });
    show();

    await waitFor(() => expect(screen.getByText('How it works')).toBeInTheDocument());

    /*
     * The screen used to print "1 holdings".
     *
     * The fix is not a pluraliser. Arabic has a dual as well as a plural and
     * Urdu agrees differently again, so the words under the numbers are
     * written to read correctly at one and at forty — which is why no noun
     * appears beside a count at all. This holds that line.
     */
    expect(screen.queryByText(/\b1 [a-z]+s\b/)).toBeNull();
  });
});

describe('nothing was removed', () => {
  it('reaches every screen from the rail, under the phase it belongs to', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/01\s+Asked/)).toBeInTheDocument());

    /*
     * Every destination the retired drawer held, still one click away.
     *
     * This is the test that makes "simplify without losing anything" a fact
     * rather than an intention: if a rearrangement drops a screen out of the
     * navigation, it fails here.
     */
    for (const label of ['Holdings', 'Contracts', 'What stands', 'Search', 'Sittings', 'The board']) {
      expect(
        screen.getAllByRole('link', { name: new RegExp(label) }).length,
        `${label} is not reachable from the rail`,
      ).toBeGreaterThan(0);
    }
  });

  it('leaves out a page this installation cannot honour', async () => {
    stub();
    show();

    // The assistant is off here, so it is absent rather than listed and
    // refusing — the same rule as every other control.
    await waitFor(() => expect(screen.getByText(/01\s+Asked/)).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Assistant/ })).toBeNull();
  });

  it('still answers the drawer address, rather than breaking a bookmark', async () => {
    stub();
    show('/more');

    /*
     * The page is gone; the address is not. Somebody has this bookmarked, or
     * written in an email to a colleague, and a dead link is a worse outcome
     * than a redirect to the screen that now holds all of it.
     */
    await waitFor(() => expect(screen.getByText('How it works')).toBeInTheDocument());
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

describe('putting something to the board', () => {
  it('asks what kind of decision in the words a secretary uses', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/Put something to the board/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Put something to the board/ }));

    /*
     * Nobody receiving an email from the treasury desk thinks "this is a
     * permitting change of institution-request origin". They think the desk
     * wants to launch something and needs a ruling.
     */
    expect(screen.getByText('A desk wants to do something new')).toBeInTheDocument();
    expect(screen.getByText('Something should be stopped or narrowed')).toBeInTheDocument();
    expect(screen.getByText('A ruling has come round for review')).toBeInTheDocument();
    expect(screen.getByText(/Somebody thinks a rule is being breached/)).toBeInTheDocument();
  });

  it('says what each choice records, before it is chosen', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/Put something to the board/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Put something to the board/ }));

    // The direction decides the quorum, the delay and whether it is ratified
    // afterwards. Somebody choosing in a hurry should see that rather than
    // discover it.
    expect(screen.getByText(/Recorded as permitting, at the institution’s request/)).toBeInTheDocument();
    expect(screen.getByText(/Recorded as restricting, following a change/)).toBeInTheDocument();
  });

  it('asks nothing else until a kind is chosen', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/Put something to the board/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Put something to the board/ }));

    expect(screen.queryByText('What is being asked')).toBeNull();

    fireEvent.click(screen.getByText('A desk wants to do something new'));
    expect(screen.getByText('What is being asked')).toBeInTheDocument();
  });

  it('says sending it decides nothing', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/Put something to the board/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Put something to the board/ }));
    fireEvent.click(screen.getByText('A desk wants to do something new'));

    // It opens as a draft. The shape, the terms and what is not being decided
    // are the board's, and a form that filled them would put words in the mouth
    // of a board that has not met.
    expect(screen.getByText(/Sending this decides nothing/)).toBeInTheDocument();
  });

  it('is absent for somebody who could not open a matter', async () => {
    stub({ role: 'observer' });
    show();

    await waitFor(() => expect(screen.getByText(/The board is clear|Open it/)).toBeInTheDocument());
    expect(screen.queryByText(/Put something to the board/)).toBeNull();
  });
});
