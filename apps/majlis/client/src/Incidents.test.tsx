import { forgetIdentity } from './lib/identity.js';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import IncidentDetail from './pages/IncidentDetail.js';
import { I18nProvider } from './lib/i18n.js';
import { buildIncidentPassage } from '../../server/src/services/passage-incident.js';
import en from './locales/en.js';

/**
 * The nine steps, and whose each one is.
 *
 * The guarantee worth testing is not that the buttons appear. It is that four
 * of the nine are the institution's and a board member is not offered them: a
 * board that could file the institution's rectification plan would be producing
 * a document saying something nobody outside the room ever said. The route
 * refuses regardless, so this is about not inviting the attempt.
 */

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

function incident(over: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    boardId: 'demo-board',
    reference: 'SNC-2026-003',
    title: 'Retail deposits priced from an interest benchmark',
    report: 'An account of what happened.',
    reportedBy: 'liaison-1',
    reportedAt: day(21),
    stage: 'determined',
    concurrences: [
      { scholarId: 'member-a', actual: true, reason: 'The approved method was specific and this was not it.', at: day(19) },
    ],
    determinedAt: day(19),
    actual: true,
    stopped: ['Retail term deposits'],
    plans: [],
    directorsApprovedAt: null,
    submittedToRegulatorAt: null,
    purification: null,
    closedAt: null,
    plan: null,
    clock: { deadline: day(-11), daysRemaining: 11, overdue: false, planFiled: false, note: '11 days left of thirty to file a rectification plan.' },
    ...over,
  };
}

function stub(who: { role: string; office: string | null }, data = incident()) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role: who.role, office: who.office, outstanding: 0, overdue: 0, items: [] });
      }
      /*
       * Where the breach stands, built by the function the server uses.
       *
       * Not a fixture. This screen no longer decides which step is current or
       * whose it is — `services/passage-incident.ts` does, and the arrival
       * queue reads the same answer — so a hand-written passage here would be
       * testing the screen against a fourth opinion, which is the shape of the
       * fault this replaced.
       */
      if (url.includes('/passage')) {
        return json(buildIncidentPassage(data as never, '2026-09-20T00:00:00Z'));
      }
      return json(data);
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/incidents/i1']}>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetail />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('the steps that belong to the institution are not offered to the board', () => {
  it('does not offer a signatory the rectification plan', async () => {
    stub({ role: 'signatory', office: null });
    show();

    await waitFor(() => expect(screen.getByText(/File a rectification plan/)).toBeInTheDocument());
    // The step is shown — knowing it is outstanding is information — but there
    // is no control on it.
    expect(screen.queryByRole('button', { name: /File the plan/ })).toBeNull();
  });

  it('offers it to the secretary', async () => {
    stub({ role: 'advisory', office: 'secretary' });
    show();
    await waitFor(() => expect(screen.getByRole('button', { name: /File the plan/ })).toBeInTheDocument());
  });

  it('offers the determination to a signatory and not to the secretary', async () => {
    stub({ role: 'signatory', office: null }, incident({ stage: 'reported', actual: null, concurrences: [], clock: null }));
    const { unmount } = show();
    await waitFor(() => expect(screen.getByRole('button', { name: /this is a breach/ })).toBeInTheDocument());
    unmount();

    /*
     * A second page load, not a second render. Who is looking is asked once
     * and shared, because seventy-two components were each asking for it
     * separately; the application cannot change identity while it is open —
     * the credential is carried by the browser session — so a test showing
     * two different members is showing two sessions, and says so.
     */
    forgetIdentity();

    stub({ role: 'advisory', office: 'secretary' }, incident({ stage: 'reported', actual: null, concurrences: [], clock: null }));
    show();
    await waitFor(() => expect(screen.getByText(/Determine whether/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /this is a breach/ })).toBeNull();
  });

  /*
   * Nothing at all to do. The window has controls that only move the member
   * through it — a step in the strip is a button, named for its act and
   * whose it is — so the claim is that those are the only buttons there are,
   * and the bar where acts stand is empty.
   */
  it('offers an observer nothing at all', async () => {
    stub({ role: 'observer', office: null });
    show();
    const bar = await screen.findByRole('toolbar');
    expect(within(bar).queryAllByRole('button')).toHaveLength(0);
    const notASteps = screen
      .queryAllByRole('button')
      .filter((b) => !(b.getAttribute('aria-label') ?? '').includes(' — '));
    expect(notASteps.map((b) => b.textContent)).toEqual([]);
  });
});

describe('what the sequence shows', () => {
  it('names whose each step is, including steps nobody has reached', async () => {
    stub({ role: 'observer', office: null });
    show();

    // Every step is in the strip, named with whose it is, reached or not.
    expect(await screen.findByRole('button', { name: /Approval by the Directors — the institution/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit to the regulator — the institution/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Determine whether it is an actual non-compliance — a signatory/ })).toBeInTheDocument();
  });

  it('shows each position in the member’s own words', async () => {
    stub({ role: 'observer', office: null });
    show();
    await waitFor(() =>
      expect(screen.getByText(/The approved method was specific/)).toBeInTheDocument(),
    );
  });

  it('states the clock in the words the server used', async () => {
    stub({ role: 'observer', office: null });
    show();
    await waitFor(() =>
      expect(screen.getByText('11 days left of thirty to file a rectification plan.')).toBeInTheDocument(),
    );
  });

  it('says an overdue clock is overdue rather than showing a negative', async () => {
    stub(
      { role: 'observer', office: null },
      incident({
        clock: { deadline: day(15), daysRemaining: -15, overdue: true, planFiled: false, note: 'The thirty days have run and no rectification plan has been filed.' },
      }),
    );
    show();
    await waitFor(() => expect(screen.getByText(/Overdue by 15/)).toBeInTheDocument());

    /*
     * A negative count, not the digits.
     *
     * This used to look for `-15` anywhere on the page, which passed until the
     * deadline happened to fall on the fifteenth: the date `2026-08-15` renders
     * on this card and contains it. The test was calendar-dependent and said
     * nothing on the days it passed. What it means is that the clock reads
     * "Overdue by 15 days" rather than "-15 days", so that is what it asks.
     */
    expect(screen.queryByText(/-15\s*day/i)).toBeNull();
  });
});

/**
 * A view is not a finding.
 *
 * ── what this holds shut ──────────────────────────────────────────────────
 *
 * A finding on a breach takes enough signatories agreeing. Measured in the
 * browser, the first of them pressed *a breach* and the window said *recorded
 * as a breach — the thirty days are running*, with no finding made and no
 * clock started; then offered the same member the same button, and when they
 * pressed it the route refused and the screen showed the green *recorded* and
 * the red refusal one above the other.
 */
describe('a view is not a finding', () => {
  const reported = (concurrences: unknown[] = []) =>
    incident({ stage: 'reported', actual: null, determinedAt: null, concurrences, clock: null, stopped: [] });

  /* The breach as the server holds it, and what the concurrence route answers. */
  function wired(start: ReturnType<typeof incident>, answer: (body: { actual: boolean }) => Response) {
    let now = start;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const json = (b: unknown, status = 200) =>
          new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/api/attention')) {
          return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
        }
        if (init?.method === 'POST' && url.includes('/concurrence')) {
          const res = answer(JSON.parse(String(init.body)));
          if (res.ok) now = (await res.clone().json()) as typeof now;
          return res;
        }
        if (url.includes('/passage')) return json(buildIncidentPassage(now as never, '2026-09-20T00:00:00Z'));
        return json(now);
      }),
    );
  }

  async function say(label: RegExp) {
    fireEvent.click(await within(await screen.findByRole('toolbar')).findByRole('button', { name: label }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'The mandate names the categories, and this is not among them.' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: label }).pop()!);
    return dialog;
  }

  it('says a first view is a view on the record, and not that the thirty days are running', async () => {
    const one = { scholarId: 'member-a', actual: true, reason: 'x'.repeat(30), at: day(0) };
    wired(reported(), () =>
      new Response(JSON.stringify(reported([one])), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    show();
    await say(/^Record: this is a breach$/);

    await waitFor(() => expect(screen.getByText('Your view is on the record: a breach.')).toBeInTheDocument());
    expect(screen.queryByText('Recorded as a breach.')).toBeNull();
    expect(screen.queryByText(/thirty days are running/)).toBeNull();
  });

  it('does not offer the member the view they have already taken, and lets them change it', async () => {
    wired(reported([{ scholarId: 'member-a', actual: true, reason: 'x'.repeat(30), at: day(1) }]), () => new Response('{}'));
    show();
    const bar = await screen.findByRole('toolbar');
    await waitFor(() => expect(bar.textContent).toContain('You said this is a breach.'));
    expect(within(bar).queryByRole('button', { name: /^Record: this is a breach$/ })).toBeNull();
    expect(within(bar).getByRole('button', { name: 'Change my view: not a breach' })).toBeInTheDocument();
  });

  it('keeps the window open with the refusal in it, and claims nothing, when the route refuses', async () => {
    wired(reported(), () =>
      new Response(JSON.stringify({ error: 'already_concurred', message: 'That member has already taken this position on this event.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    show();
    const dialog = await say(/^Record: this is a breach$/);

    await waitFor(() => expect(within(dialog).getByText(/already taken this position/)).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(screen.queryByText('Recorded as a breach.')).toBeNull();
    expect(screen.queryByText(/Your view is on the record/)).toBeNull();
  });

  it('says the finding is made when this view is the one that makes it', async () => {
    const made = incident({ stage: 'determined', actual: true, determinedAt: day(0), clock: null, stopped: [] });
    wired(reported([{ scholarId: 'member-b', actual: true, reason: 'x'.repeat(30), at: day(1) }]), () =>
      new Response(JSON.stringify(made), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    show();
    await say(/^Record: this is a breach$/);
    await waitFor(() => expect(screen.getByText('Recorded as a breach.')).toBeInTheDocument());
  });
});

/*
 * Every other act on a breach says what its own window promised. The acts all
 * go through one function, which came to answer with the breach it got back —
 * and an act that answers is taken at its word, so a breach record would have
 * been drawn as the sentence of what was done.
 */
describe('an act that has nothing of its own to say', () => {
  it('says what its window said it would', async () => {
    let now = incident({ stopped: [], clock: null });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const json = (b: unknown) =>
          new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/api/attention')) {
          return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
        }
        if (init?.method === 'POST' && url.includes('/stopped')) {
          now = { ...now, stopped: ['Short-term paper purchases'] };
          return json(now);
        }
        if (url.includes('/passage')) return json(buildIncidentPassage(now as never, '2026-09-20T00:00:00Z'));
        return json(now);
      }),
    );
    show();

    fireEvent.click(await within(await screen.findByRole('toolbar')).findByRole('button', { name: /^Record what stops$/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Short-term paper purchases' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: /^Record what stops$/ }).pop()!);

    await waitFor(() => expect(screen.getByText(en['sw.stop.did'])).toBeInTheDocument());
  });
});
