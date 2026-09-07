import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Questions from './pages/Questions.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The queue, and the two things it must not let a board do quietly.
 *
 * It must not let a member reopen something the board already declined without
 * saying so, and it must not offer the institution's own subject line as the
 * board's wording — the two are different acts and the whole path exists to
 * keep them apart.
 */

const QUESTION =
  'May we hold the wrapped form of a sukuk we already hold directly, where the wrapper mints one ' +
  'token per unit deposited and burns on redemption?';

const submission = (over: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  boardId: 'demo-board',
  institutionId: 'inst-1',
  arrivedAt: '2026-09-01T08:00:00.000Z',
  recordedAt: '2026-09-01T08:00:00.000Z',
  askedBy: 'Layla Haddad, Treasury',
  recordedBy: 'desk-treasury',
  onBehalf: false,
  subject: 'Wrapped sukuk for the treasury desk',
  question: QUESTION,
  background: '',
  awaiting: 'Sign the collateral agreement, which is otherwise ready.',
  attachments: [],
  dispositions: [],
  standing: 'waiting',
  matterId: null,
  waitedHours: 145,
  ...over,
});

function stub(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/api/attention')) {
        return new Response(JSON.stringify({ scholarId: 'member-a', role: 'signatory', items: [] }), {
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Questions boardId="demo-board" />
      </MemoryRouter>
    </I18nProvider>,
  );

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('the queue', () => {
  it('shows the institution’s own words, marked as theirs', async () => {
    stub({ submissions: [submission()], waiting: ['sub-1'] });
    show();

    await waitFor(() => expect(screen.getByText(/burns on redemption/)).toBeInTheDocument());
    expect(screen.getByText(/As they put it/i)).toBeInTheDocument();
    expect(screen.getByText(/Layla Haddad, Treasury/)).toBeInTheDocument();
  });

  it('says how long it has been waiting, from when they asked', async () => {
    stub({ submissions: [submission()], waiting: ['sub-1'] });
    show();
    // 145 hours reads as days, not as a count of hours nobody can picture.
    await waitFor(() => expect(screen.getByText(/6 days/i)).toBeInTheDocument());
    expect(document.body.textContent).not.toContain('145');
  });

  it('says when a member entered it for somebody else', async () => {
    stub({ submissions: [submission({ onBehalf: true })], waiting: ['sub-1'] });
    show();
    await waitFor(() =>
      expect(screen.getByText(/Entered by a member on their behalf/i)).toBeInTheDocument(),
    );
  });

  it('shows what they are waiting to do, without calling it a deadline', async () => {
    stub({ submissions: [submission()], waiting: ['sub-1'] });
    show();
    await waitFor(() => expect(screen.getByText(/collateral agreement/)).toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(/deadline|due by/i);
  });

  /*
   * The board's reading starts empty. Prefilling it with the bank's subject
   * line would make the two the same string by accident.
   */
  it('does not offer the institution’s subject as the board’s wording', async () => {
    stub({ submissions: [submission()], waiting: ['sub-1'] });
    show();

    await waitFor(() => expect(screen.getByText(/Take it up as a matter/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Take it up as a matter/i));

    const inputs = document.querySelectorAll('input');
    for (const input of inputs) {
      expect(input.value).not.toBe('Wrapped sukuk for the treasury desk');
    }
    expect(screen.getByText(/Your own wording, not theirs/i)).toBeInTheDocument();
  });

  it('says a decline is being reconsidered before it is reopened', async () => {
    stub({
      submissions: [
        submission({
          standing: 'declined',
          dispositions: [
            {
              kind: 'declined',
              at: '2026-09-03T08:00:00.000Z',
              by: 'member-a',
              reason: 'Come back with the audit of the mint and burn.',
            },
          ],
        }),
      ],
      waiting: [],
    });
    show();

    await waitFor(() => expect(screen.getByText(/audit of the mint and burn/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Take it up as a matter/i));
    expect(screen.getByText(/declined once/i)).toBeInTheDocument();
  });

  it('will not let a decline be recorded with no reason', async () => {
    stub({ submissions: [submission()], waiting: ['sub-1'] });
    show();

    await waitFor(() => expect(screen.getByText(/Do not take it up/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Do not take it up/i));

    const button = screen.getAllByText(/Do not take it up/i).find((el) => el.closest('button'));
    expect(button?.closest('button')).toBeDisabled();
  });

  it('says so when nothing has been put to the board', async () => {
    stub({ submissions: [], waiting: [] });
    show();
    await waitFor(() =>
      expect(screen.getByText(/Nothing has been put to the board/i)).toBeInTheDocument(),
    );
  });

  it('survives a response of the wrong shape rather than crashing the page', async () => {
    stub({ submissions: 'not an array' });
    show();
    await waitFor(() =>
      expect(screen.getByText(/Nothing has been put to the board/i)).toBeInTheDocument(),
    );
  });
});
