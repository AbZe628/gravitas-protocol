import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import Calendar from './pages/Calendar.js';

/**
 * Convening, offered where it can be honoured and nowhere else.
 *
 * ── what a member saw ─────────────────────────────────────────────────────
 *
 * *"Kad odes u coming i stisnes convene meeting ne desi se nista."*
 *
 * Coming offered the act to everybody. The form that performs it is the
 * chair's: a member who is not the chair pressed convene, arrived at the
 * sittings screen, and found nothing there. From where they stood, pressing
 * it did nothing at all — and nothing on either screen said why.
 *
 * The rule this settles is the one the rest of the application keeps: a
 * control that cannot be honoured is absent, and what stands in its place
 * says who does it.
 */

const CADENCE = {
  lastHeldAt: '2026-08-20T09:00:00.000Z',
  dueBy: '2027-02-20T09:00:00.000Z',
  overdue: false,
  nextConvenedAt: null as string | null,
  note: 'Counted as 6 months from the last meeting held.',
};

function stub(office: string | null, nextConvenedAt: string | null = null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.includes('/api/attention'))
        return json({
          scholarId: 'member-x',
          role: 'signatory',
          office,
          outstanding: 0,
          overdue: 0,
          items: [],
        });
      if (url.includes('/api/meetings'))
        return json({ boardId: 'b', meetings: [], cadence: { ...CADENCE, nextConvenedAt } });
      if (url.includes('/api/calendar')) return json({ entries: [], gaps: [] });
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

const show = () =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <Calendar />
      </I18nProvider>
    </MemoryRouter>,
  );

describe('nothing is convened yet', () => {
  it('gives the chair the act once, pointed at the form rather than the screen', async () => {
    stub('chair');
    show();

    const acts = await screen.findAllByRole('link', { name: /Convene a meeting/ });
    /*
     * Once. There were two — the heading's, gated to the chair, and a
     * second in the rhythm block that was offered to everybody. Two
     * controls for one act is how the two came to disagree about who may
     * perform it.
     */
    expect(acts).toHaveLength(1);
    /*
     * And not the sentence that stands in the act's place. Telling the
     * chair who calls a sitting, beside the button they are about to press
     * to call one, is the duplication back in a different costume — which
     * is what an injected fault proved this file did not catch.
     */
    expect(screen.queryByText(/The chair calls a sitting/)).not.toBeInTheDocument();
    /*
     * With the query, so the form is open on arrival. Landing on the
     * sittings screen and having to find the control again is the same
     * fault one step further along.
     */
    expect(acts[0]).toHaveAttribute('href', '/meetings?convene=1');
  });

  it('gives a member who cannot convene the answer instead of the act', async () => {
    stub(null);
    show();

    await screen.findByText(/The chair calls a sitting/);
    expect(screen.queryByRole('link', { name: /Convene a meeting/ })).not.toBeInTheDocument();
  });

  it('gives the secretary the same answer: the office is not the chair’s', async () => {
    stub('secretary');
    show();

    await screen.findByText(/The chair calls a sitting/);
    expect(screen.queryByRole('link', { name: /Convene a meeting/ })).not.toBeInTheDocument();
  });
});

describe('a sitting is already convened', () => {
  it('says when, and stops telling a member nothing is convened', async () => {
    stub('chair', '2026-10-15T13:00:00.000Z');
    show();

    await waitFor(() => expect(screen.getByText(/Convened for/)).toBeInTheDocument());
    expect(screen.queryByText(/The chair calls a sitting/)).not.toBeInTheDocument();
    /*
     * The heading keeps its act, and that is right: a board may call a
     * second sitting while one stands. What must not stand beside a date
     * is a sentence saying nothing is convened.
     */
    expect(screen.getAllByRole('link', { name: /Convene a meeting/ })).toHaveLength(1);
  });

  it('says nothing about who convenes to a member who can see the date', async () => {
    stub(null, '2026-10-15T13:00:00.000Z');
    show();

    await waitFor(() => expect(screen.getByText(/Convened for/)).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Convene a meeting/ })).not.toBeInTheDocument();
  });
});
