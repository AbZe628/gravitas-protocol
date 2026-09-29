import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Questions from './pages/Questions.js';
import QuestionDetail from './pages/QuestionDetail.js';
import { I18nProvider } from './lib/i18n.js';
import { buildQuestionPassage } from '../../server/src/services/passage-question.js';

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
  draft: null,
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

/**
 * One question, in its own window, read the way the server reads it.
 *
 * The passage is built by the function the server uses, so the window is
 * tested against the real reading rather than a fixture's opinion of it.
 */
function stubOne(one: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url);
      const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
      if (u.includes('/api/attention')) return json({ scholarId: 'member-a', role: 'signatory', items: [] });
      if (u.includes('/api/passages/question/')) return json(buildQuestionPassage(one as never, '2026-09-20T00:00:00Z'));
      if (u.includes('/api/submissions/')) return json({ submission: one });
      return json({});
    }),
  );
}

const showOne = () =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/questions/sub-1']}>
        <Routes>
          <Route path="/questions/:id" element={<QuestionDetail />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('the queue', () => {
  it('shows the institution’s own words, marked as theirs', async () => {
    stubOne(submission());
    showOne();

    await waitFor(() => expect(screen.getByText(/burns on redemption/)).toBeInTheDocument());
    expect(screen.getByText(/As they put it/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Layla Haddad, Treasury/).length).toBeGreaterThan(0);
  });

  it('draws each question as one line that opens its own window', async () => {
    stub({ submissions: [submission()], waiting: ['sub-1'] });
    show();
    const line = await screen.findByRole('link', { name: 'Wrapped sukuk for the treasury desk' });
    expect(line.getAttribute('href')).toBe('/questions/sub-1');
  });

  it('says how long it has been waiting, from when they asked', async () => {
    stub({ submissions: [submission()], waiting: ['sub-1'] });
    show();
    /*
     * Twice, and both are wanted: once on the question itself, and once at the
     * head of the page as the longest wait in the queue.
     *
     * The second is the number the board is judged on and it used to be
     * nowhere — a reader had to scan every card and compare the figures
     * themselves.
     */
    await waitFor(() => expect(screen.getAllByText(/6 days/i).length).toBeGreaterThan(1));
    expect(screen.getByText(/longest wait/i)).toBeInTheDocument();

    // 145 hours reads as days, not as a count of hours nobody can picture.
    expect(document.body.textContent).not.toContain('145');
  });

  it('says what it cannot see, rather than presenting the queue as the whole truth', async () => {
    stub({ submissions: [submission()], waiting: ['sub-1'] });
    show();

    /*
     * A board reading a queue of three has no way of knowing the desk sent
     * five. Every screen in this application names its own edges, and this
     * one's edge is that a question asked by email and never entered here
     * cannot be counted.
     */
    await waitFor(() =>
      expect(screen.getByText(/is not on this list, and Majlis cannot know about it/i)).toBeInTheDocument(),
    );
  });

  it('says when a member entered it for somebody else', async () => {
    stubOne(submission({ onBehalf: true }));
    showOne();
    await waitFor(() =>
      expect(screen.getAllByText(/Entered by a member on their behalf/i).length).toBeGreaterThan(0),
    );
  });

  it('shows what they are waiting to do, without calling it a deadline', async () => {
    stubOne(submission());
    showOne();
    await waitFor(() => expect(screen.getByText(/collateral agreement/)).toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(/deadline|due by/i);
  });

  /*
   * The board's reading starts empty. Prefilling it with the bank's subject
   * line would make the two the same string by accident.
   */
  it('does not offer the institution’s subject as the board’s wording', async () => {
    stubOne(submission());
    showOne();

    fireEvent.click(await screen.findByRole('button', { name: /^Take it up as a matter$/i }));

    const inputs = document.querySelectorAll('input');
    for (const input of inputs) {
      expect(input.value).not.toBe('Wrapped sukuk for the treasury desk');
    }
    expect(screen.getByText(/Your wording, not theirs/i)).toBeInTheDocument();
  });

  it('says a decline is being reconsidered before it is reopened', async () => {
    stubOne(
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
    );
    showOne();

    await waitFor(() => expect(screen.getAllByText(/audit of the mint and burn/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /^Take it up as a matter$/i }));
    expect(screen.getByText(/declined once/i)).toBeInTheDocument();
  });

  it('will not let a decline be recorded with no reason', async () => {
    stubOne(submission());
    showOne();

    fireEvent.click(await screen.findByRole('button', { name: /^Do not take it up$/i }));

    // The press inside the window it opened, which has no reason yet.
    const press = within(screen.getByRole('dialog')).getByRole('button', { name: /^Do not take it up$/i });
    expect(press).toBeDisabled();
  });

  it('says so when nothing has been put to the board', async () => {
    stub({ submissions: [], waiting: [] });
    show();
    await waitFor(() =>
      expect(screen.getByText(/Nothing has been put to the board/i)).toBeInTheDocument(),
    );
  });

  it('says it could not read one question rather than drawing a broken window', async () => {
    stubOne('not a question');
    showOne();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('survives a response of the wrong shape rather than crashing the page', async () => {
    stub({ submissions: 'not an array' });
    show();
    await waitFor(() =>
      expect(screen.getByText(/Nothing has been put to the board/i)).toBeInTheDocument(),
    );
  });
});

/*
 * Taking a question up is the first step of the matter it becomes, so what
 * follows is that matter, at its address. The link was named *go to what needs
 * you* and pointed at the matter — a label for one place on a link to another.
 */
describe('a question taken up', () => {
  it('leads to the matter it became, and says so', async () => {
    const one = submission();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
        if (u.includes('/api/attention')) return json({ scholarId: 'member-a', role: 'signatory', items: [] });
        if (init?.method === 'POST' && u.includes('/api/submissions/sub-1/open')) {
          return json({
            submission: { ...one, standing: 'opened', matterId: 'matter-9' },
            matter: { id: 'matter-9' },
            notice: { subject: 's', body: 'b', concerns: [] },
            delivery: { sent: false, via: 'none', reason: 'none' },
          });
        }
        if (u.includes('/api/passages/question/')) return json(buildQuestionPassage(one as never, '2026-09-20T00:00:00Z'));
        if (u.includes('/api/submissions/')) return json({ submission: one });
        return json({});
      }),
    );
    showOne();

    fireEvent.click(await screen.findByRole('button', { name: /^Take it up as a matter$/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/as the board puts it/i), { target: { value: 'Whether the wrapped form may be held' } });
    fireEvent.change(within(dialog).getAllByRole('textbox')[1], { target: { value: 'The board is asked whether the wrapper changes what is held.' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: /^Take it up as a matter$/i }).pop()!);

    const link = await screen.findByRole('link', { name: /Open the matter/ });
    expect(link.getAttribute('href')).toBe('/matters/matter-9');
    expect(screen.queryByRole('link', { name: /Go to what needs you/ })).toBeNull();
  });
});
