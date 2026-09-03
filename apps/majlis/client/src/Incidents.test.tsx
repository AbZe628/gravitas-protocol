import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import IncidentDetail from './pages/IncidentDetail.js';
import { I18nProvider } from './lib/i18n.js';

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

    stub({ role: 'advisory', office: 'secretary' }, incident({ stage: 'reported', actual: null, concurrences: [], clock: null }));
    show();
    await waitFor(() => expect(screen.getByText(/Determine whether/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /this is a breach/ })).toBeNull();
  });

  it('offers an observer nothing at all', async () => {
    stub({ role: 'observer', office: null });
    show();
    await waitFor(() => expect(screen.getByText(/Purification/)).toBeInTheDocument());
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('what the sequence shows', () => {
  it('names whose each step is, including steps nobody has reached', async () => {
    stub({ role: 'observer', office: null });
    show();

    await waitFor(() => expect(screen.getByText(/Approval by the Directors/)).toBeInTheDocument());
    expect(screen.getByText(/Submit to the regulator/)).toBeInTheDocument();
    expect(screen.getAllByText(/the institution/i).length).toBeGreaterThan(0);
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
    expect(screen.queryByText(/-15/)).toBeNull();
  });
});
