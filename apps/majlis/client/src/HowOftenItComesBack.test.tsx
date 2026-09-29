import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import { forgetIdentity } from './lib/identity.js';
import { forgetMembers } from './lib/members.js';
import RuleDetail from './pages/RuleDetail.js';
import en from './locales/en.js';

/**
 * A ruling that nothing brings back, and the board answering it.
 *
 * ── the step that arrived and could not be done ───────────────────────────
 *
 * The passage carried *how often it comes back* as an open step of the
 * board's own, so it sat in every signatory's queue. Nothing in the
 * application wrote a rule — no route, no method on the store — and the only
 * act on the step was *look at this again*, which opens a matter about the
 * ruling and answers a different question. Found by opening the ruling in the
 * browser and looking for the button.
 *
 * ── and the page read the wrong list ──────────────────────────────────────
 *
 * Beside the facts, *next review* came out of `/api/reviews`, which answers
 * *which rulings need attention* and carries only the due and the unanswered.
 * A ruling with a perfectly good schedule was absent from it and so said *no
 * review scheduled* on its own page — the board's own answer reported back to
 * them as the gap they had just closed. Found live, after the act landed and
 * the screen did not change.
 */

const RULE = {
  id: 'r1',
  boardId: 'demo-board',
  title: 'Tangible asset ratio',
  statement: 'The ratio must be at least half.',
  parameters: [],
  parameterHash: '0x0',
  version: 1,
  inForceFrom: '2026-02-18T00:00:00.000Z',
  supersededBy: null,
  supersedes: null,
  sources: [],
};

const passage = (intervalState: 'open' | 'done') => ({
  of: { kind: 'review', id: 'r1' },
  groups: [
    {
      key: 'coming_back',
      order: 'sequence',
      steps: [
        {
          key: 'interval',
          act: { key: 'review.step.interval.act' },
          whose: 'board',
          state: intervalState,
          at: null,
          standing: intervalState === 'open' ? { key: 'review.step.interval.standing' } : null,
          enforced: false,
          why: { key: 'review.step.interval.why' },
          holdable: intervalState === 'open',
          holder: null,
        },
      ],
    },
  ],
  next:
    intervalState === 'open'
      ? {
          key: 'interval',
          act: { key: 'review.step.interval.act' },
          whose: 'board',
          state: 'open',
          at: null,
          standing: { key: 'review.step.interval.standing' },
          enforced: false,
          why: { key: 'review.step.interval.why' },
          holdable: true,
          holder: null,
        }
      : null,
  waiting: null,
  settled: null,
  holder: null,
  holdable: true,
});

let posted: { url: string; body: unknown }[] = [];

function stub(review: Record<string, unknown>, intervalState: 'open' | 'done' = 'open') {
  posted = [];
  forgetIdentity();
  forgetMembers();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (init?.method === 'POST') {
        posted.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
        return json({ rule: RULE, review });
      }
      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      }
      if (url.includes('/api/settings')) return json({ members: [] });
      // The attention list, which carries only what needs attention. The page
      // must not take one ruling's own state from it.
      if (url.includes('/api/reviews')) return json({ asOf: '2026-09-29T00:00:00Z', due: 0, unscheduled: 0, items: [] });
      // The passage first: it is also a URL with 'review' in it, and matched
      // the line below, so the window read a review status as its own reading.
      if (url.includes('/api/passages/review/')) return json(passage(intervalState));
      if (url.endsWith('/review')) return json(review);
      if (url.includes('/api/rules')) return json([RULE]);
      return json({});
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/rules/r1']}>
        <Routes>
          <Route path="/rules/:id" element={<RuleDetail />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

const unscheduled = {
  ruleId: 'r1',
  boardId: 'demo-board',
  title: RULE.title,
  state: 'unscheduled',
  countingFrom: RULE.inForceFrom,
  everyMonths: null,
  dueAt: null,
  daysUntilDue: null,
  overdue: false,
  note: 'In force with no review interval.',
};

describe('a ruling nothing will bring back', () => {
  it('offers the board a way to say how often, and sends what they said', async () => {
    stub(unscheduled);
    show();

    fireEvent.click(await screen.findByRole('button', { name: en['interval.say'] }));
    const months = await screen.findByLabelText(en['interval.months']);
    fireEvent.change(months, { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: en['interval.record'] }));

    // Two: the panel the form opens in, and the act's own window on top of it.
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(1));
    const dialog = screen.getAllByRole('dialog').pop()!;
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'The ratio it rests on is reported each quarter.' },
    });
    fireEvent.click(within(dialog).getAllByRole('button', { name: en['interval.record'] }).pop()!);

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toContain('/api/rules/r1/interval');
    expect(posted[0].body).toMatchObject({ everyMonths: 6 });
    expect((posted[0].body as { reason: string }).reason).toContain('each quarter');
  });

  it('lets the board say it does not come back on a clock', async () => {
    stub(unscheduled);
    show();

    fireEvent.click(await screen.findByRole('button', { name: en['interval.say'] }));
    fireEvent.click(await screen.findByRole('button', { name: en['interval.noClock'] }));
    fireEvent.click(screen.getByRole('button', { name: en['interval.record'] }));

    // Two: the panel the form opens in, and the act's own window on top of it.
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(1));
    const dialog = screen.getAllByRole('dialog').pop()!;
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'The structure has not moved in twenty years.' },
    });
    fireEvent.click(within(dialog).getAllByRole('button', { name: en['interval.record'] }).pop()!);

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].body).toMatchObject({ everyMonths: null });
  });
});

describe('what the facts say about coming back', () => {
  const like = (over: Record<string, unknown>) => ({ ...unscheduled, ...over });

  it('names the date where there is one, although the attention list is empty', async () => {
    stub(like({ state: 'scheduled', everyMonths: 6, dueAt: '2026-10-02T00:00:00.000Z' }), 'done');
    show();

    await waitFor(() => expect(screen.getByText('2026-10-02')).toBeInTheDocument());
    expect(screen.queryByText(en['review.unscheduled'])).toBeNull();
  });

  it('separates the board’s own answer from nobody having answered', async () => {
    stub(like({ state: 'no_clock' }), 'done');
    const { unmount } = show();
    await waitFor(() => expect(screen.getByText(en['review.notOnAClock'])).toBeInTheDocument());
    expect(screen.queryByText(en['review.unscheduled'])).toBeNull();
    unmount();

    stub(unscheduled);
    show();
    await waitFor(() => expect(screen.getAllByText(en['review.unscheduled']).length).toBeGreaterThan(0));
    expect(screen.queryByText(en['review.notOnAClock'])).toBeNull();
  });
});
