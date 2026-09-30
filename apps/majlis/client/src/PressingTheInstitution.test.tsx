import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import { forgetIdentity } from './lib/identity.js';
import { forgetMembers } from './lib/members.js';
import IncidentDetail from './pages/IncidentDetail.js';
import en from './locales/en.js';
import { buildIncidentPassage } from '../../server/src/services/passage-incident.js';
import { incidents } from '../../server/src/data/seed.js';

/**
 * A step that is the bank's, standing, and what the board may do about it.
 *
 * ── what the screen offered before this ───────────────────────────────────
 *
 * The seeded breach, opened in the browser: forty-seven days old, the plan
 * endorsed, nothing put to the Board of Directors for thirty-three of them,
 * and forty-one thousand outstanding in purification. The breach's own screen
 * said *awaiting the Directors*, *overdue by 13 days*, and then offered a
 * board member exactly two controls and one sentence:
 *
 *     Nobody has taken this on yet.   [ Take this on ]  [ Place with… ]
 *     Waiting on the institution. Nothing here is yours to press.
 *
 * *Take this on* would have put a scholar's name on the bank's own filing.
 * The sentence is the fault stated outright: pressing is the one thing that
 * *is* the board's when the work is the bank's.
 *
 * ── two more, found only by doing it ──────────────────────────────────────
 *
 * The control was drawn on the step the passage calls *next* and on no other.
 * Purification runs beside the plan and is open at the same time as the
 * Directors' approval, so a member who opened *purification* — the amount
 * worked out, nothing recorded paid — found nothing to press at all, while
 * the same breach offered it one step earlier.
 *
 * And the line quoting what was last said quoted the last **chase** whatever
 * had happened since, so after the chair raised it the screen read *raised to
 * the chair by Board Member A* and then quoted, as the raising, what that
 * member had written days before while chasing.
 */

const BREACH = incidents.find((i) => i.id === 'incident-2026-08-14')!;
const NOW = '2026-09-30T12:00:00Z';

/*
 * The passage from the server's own reading of the seeded record, not a
 * fixture. What the screen offers has to follow what the server said, or this
 * would be testing the screen against an opinion written here — and the one
 * thing a press control must never do is appear where the route refuses.
 */
const PASSAGE = buildIncidentPassage(BREACH as never, NOW);

const MEMBERS = [
  { scholarId: 'member-a', name: 'Amina Chair', title: '', signatory: true, role: 'signatory', office: 'chair' },
  { scholarId: 'member-b', name: 'Bilal Rahman', title: '', signatory: true, role: 'signatory', office: 'secretary' },
  { scholarId: 'member-c', name: 'Casim Ode', title: '', signatory: true, role: 'signatory', office: null },
];

let posted: { url: string; body: Record<string, unknown> }[] = [];

function stub(who: { scholarId: string; role: string; office: string | null }) {
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
        posted.push({ url, body: init.body ? JSON.parse(String(init.body)) : {} });
        return json(BREACH);
      }
      if (url.includes('/api/attention')) {
        return json({ ...who, outstanding: 0, overdue: 0, items: [] });
      }
      if (url.includes('/api/settings')) return json({ members: MEMBERS });
      if (url.includes('/passage')) return json(PASSAGE);
      if (url.includes('/api/incidents/')) return json(BREACH);
      return json({});
    }),
  );
}

const show = () =>
  render(
    <MemoryRouter initialEntries={[`/incidents/${BREACH.id}`]}>
      <I18nProvider>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetail />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );

const CHAIR = { scholarId: 'member-a', role: 'signatory', office: 'chair' };
const SECRETARY = { scholarId: 'member-b', role: 'signatory', office: 'secretary' };
const PLAIN = { scholarId: 'member-c', role: 'signatory', office: null };
const ADVISORY = { scholarId: 'advisor-1', role: 'advisory', office: null };

const steps = PASSAGE.groups.flatMap((g) => g.steps);
const owed = steps.filter((s) => s.state === 'open' && s.whose === 'institution');

afterEach(() => vi.unstubAllGlobals());

describe('the record this is read from', () => {
  it('has more than one step outstanding with the institution, or two of these prove nothing', () => {
    expect(owed.map((s) => s.key)).toContain('directors');
    expect(owed.length, 'only one institution step is open here').toBeGreaterThan(1);
    expect(PASSAGE.next?.key).toBe('directors');
  });

  it('counts each step from its own turn and not from the report', () => {
    const directors = owed.find((s) => s.key === 'directors');
    expect(directors?.pressing?.since).toBe('2026-08-27T15:30:00Z');
    // The file is older than the step, because the board spent days of it.
    expect(directors?.pressing?.days).toBeLessThan(PASSAGE.waiting!.days);
  });
});

describe('what the screen offers on a step the board does not own', () => {
  it('offers pressing, and does not say that nothing here is the board’s', async () => {
    stub(PLAIN);
    show();

    await screen.findByRole('button', { name: en['press.chase'] });
    expect(screen.getByText(new RegExp(en['press.neverChased']))).toBeInTheDocument();
    // The sentence that used to sit directly beneath the control.
    expect(screen.queryByText(/No act on this step/)).toBeNull();
  });

  /*
   * The fault the browser found. The window drew this only where the step was
   * the passage's `next`, so purification — open, forty-one thousand owed —
   * offered nothing, while the Directors' step one place earlier offered it.
   */
  it('offers it on an open step that is not the next one', async () => {
    const other = owed.find((s) => s.key !== PASSAGE.next?.key)!;
    expect(other.key, 'no second institution step to stand on').toBe('purify');

    stub(PLAIN);
    show();

    fireEvent.click(await screen.findByRole('button', { name: new RegExp(en['breach.step.purify.act']) }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: en['press.chase'] })).toBeInTheDocument(),
    );
  });

  it('sends what was said, against the step it was said on', async () => {
    stub(PLAIN);
    show();

    fireEvent.click(await screen.findByRole('button', { name: en['press.chase'] }));
    const dialog = screen.getAllByRole('dialog').pop()!;
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Asked the liaison for the date the Directors will take the endorsed plan.' },
    });
    fireEvent.click(within(dialog).getAllByRole('button', { name: en['press.chase'] }).pop()!);

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toContain('/press');
    expect(posted[0].body).toMatchObject({ step: 'directors', kind: 'chase' });
    expect(String(posted[0].body.reason)).toContain('endorsed plan');
  });

  it('offers nothing at all to a member who does not carry the board’s voice', async () => {
    stub(ADVISORY);
    show();

    await screen.findByRole('heading', { name: en['breach.step.directors.act'] });
    expect(screen.queryByRole('button', { name: en['press.chase'] })).toBeNull();
  });
});

describe('raising it, which is the chair’s', () => {
  /*
   * `mayRaise` is the server's answer and is true on this step for everybody,
   * because somebody has chased it. Who may act on it is the office.
   */
  const chased = {
    ...PASSAGE,
    groups: PASSAGE.groups.map((g) => ({
      ...g,
      steps: g.steps.map((s) =>
        s.key === 'directors' && s.pressing
          ? {
              ...s,
              pressing: {
                ...s.pressing,
                mayRaise: true,
                chases: [{ by: 'member-c', at: '2026-09-20T09:00:00Z', reason: 'Asked for a date.' }],
              },
            }
          : s,
      ),
    })),
  };

  function stubChased(who: { scholarId: string; role: string; office: string | null }) {
    stub(who);
    const before = globalThis.fetch as typeof fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/passage') && init?.method !== 'POST') {
        return new Response(JSON.stringify(chased), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return before(input, init);
    });
  }

  it('is offered to the chair', async () => {
    stubChased(CHAIR);
    show();
    expect(await screen.findByRole('button', { name: en['press.raise'] })).toBeInTheDocument();
  });

  it('is not offered to the secretary or to a signatory without the office', async () => {
    for (const who of [SECRETARY, PLAIN]) {
      stubChased(who);
      const { unmount } = show();
      // They may still press; it is raising that is the chair's.
      await screen.findByRole('button', { name: en['press.again'] });
      expect(screen.queryByRole('button', { name: en['press.raise'] }), who.scholarId).toBeNull();
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('quotes the raising, and not the chase it happened to follow', async () => {
    const raised = {
      ...chased,
      groups: chased.groups.map((g) => ({
        ...g,
        steps: g.steps.map((s) =>
          s.key === 'directors' && s.pressing
            ? {
                ...s,
                pressing: {
                  ...s.pressing,
                  mayRaise: false,
                  raised: { by: 'member-a', at: '2026-09-29T09:00:00Z', reason: 'Taking it to the Directors myself.' },
                },
              }
            : s,
        ),
      })),
    };

    stub(CHAIR);
    const before = globalThis.fetch as typeof fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/passage') && init?.method !== 'POST') {
        return new Response(JSON.stringify(raised), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return before(input, init);
    });

    show();
    await screen.findByText(/Taking it to the Directors myself/);
    expect(screen.queryByText(/Asked for a date/), 'quoted the chase under the raising').toBeNull();
  });
});
