import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * A failed refresh does not take away a screen that is already there.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * Press an act with no connection. The act sets its refusal correctly, then
 * calls its loader to pick up the new state, that fails too, and
 * `setFailed(true)` returns the error page for the whole screen. Measured on
 * a breach: the nine steps, the report, the concurrences and the refusal
 * itself all went, and the reader was left with "Could not load." — three
 * words that did not mention the thing they had just pressed.
 *
 * Eight screens re-run their loader after an act and every one had it.
 *
 * ── why this test and not the browser probe ───────────────────────────────
 *
 * The first attempt to prove the fix drove a real browser, cut the wire, and
 * fired a `resize` event hoping to make the screens refetch. They all kept
 * their content and the probe reported six of six — but `resize` does not
 * re-run a loader, so nothing had refetched and the test proved nothing. It
 * would have passed just as happily against the broken code.
 *
 * This drives the act a person actually presses, which is what calls the
 * loader, and it fails against the old code.
 */

const WAITING = {
  id: 'sub-1',
  boardId: 'demo-board',
  institutionId: 'demo-institution',
  arrivedAt: '2026-07-14T08:20:00Z',
  recordedAt: '2026-07-14T08:20:00Z',
  askedBy: 'Treasury desk',
  recordedBy: 'member-b',
  onBehalf: false,
  subject: 'A question the board has not answered',
  question: 'May we do the thing described at length in this sentence of ample width?',
  background: '',
  awaiting: '',
  attachments: [],
  draft: null,
  dispositions: [],
  standing: 'waiting',
  matterId: null,
  waitedHours: 12,
};

function json(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/**
 * A wire that carries the act and then dies before the refresh.
 *
 * This is the exact shape of the fault and it took a wrong test to find it.
 * The act and the refresh are two separate journeys. If the wire is already
 * cut when the act is pressed, the act itself is refused, `onDone` is never
 * reached and the loader never runs — so nothing is proved. The screen is
 * only lost when the act *succeeds* and the refresh that follows it fails,
 * which is a connection that drops in the second between the two, or a
 * server that answers one request and not the next.
 *
 * So: answer the act, then go dead.
 */
function wireThatDiesAfterTheAct() {
  let dead = false;
  /** How many journeys were attempted after the wire died. Counted, so the
   *  test can wait for the failed refresh instead of guessing at a delay. */
  const refused = { count: 0 };
  const wire = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (dead) {
        refused.count += 1;
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      const url = String(input);

      // The act. It goes through, and the wire dies behind it.
      if (url.includes('/decline')) {
        dead = true;
        return json({ submission: { ...WAITING, standing: 'declined' } });
      }
      if (init && init.method && init.method !== 'GET') {
        dead = true;
        return json({});
      }

      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, items: [] });
      if (url.includes('/api/submissions'))
        return json({ submissions: [WAITING], waiting: [WAITING.id] });
      return json({});
  });
  vi.stubGlobal('fetch', wire);
  return refused;
}

describe('a refresh that cannot reach the board keeps the screen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('the queue is still the queue after the refresh behind an act fails', async () => {
    const refused = wireThatDiesAfterTheAct();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/questions']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    );

    // It rendered, with the question on it.
    const subject = await screen.findByText(WAITING.subject, {}, { timeout: 4000 });
    expect(subject).toBeTruthy();

    // Decline the question. The act goes through; the refresh behind it does not.
    fireEvent.click(await screen.findByRole('button', { name: /do not take it up/i }));

    /*
     * Found by name, and not allowed to be missing. An earlier version of this
     * test swallowed a missing field and carried on; the act then stayed
     * disabled, the press did nothing, the loader never ran and the test
     * passed against the broken code. Nothing here may be optional.
     */
    const reason = await screen.findByRole('textbox', {
      name: /why, so they know what to do next/i,
    });
    fireEvent.change(reason, { target: { value: 'A reason, so the act is allowed.' } });

    const press = screen.getByRole('button', { name: /^do not take it up$/i });
    expect((press as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(press);

    /*
     * Wait for the refresh to have actually been attempted and failed. Without
     * this the assertion below runs on the frame before the failure and is
     * true of any code at all — which is how the first version of this test
     * came to pass against the fault it was written to hold shut.
     */
    await waitFor(() => {
      expect(refused.count).toBeGreaterThan(0);
    });

    /*
     * The page is still the page. Before the fix this became "Could not
     * load." and the question, the queue and the refusal all disappeared.
     */
    await waitFor(() => {
      expect(screen.queryByText(WAITING.subject)).toBeTruthy();
    });
    expect(screen.queryByText(/could not load/i)).toBeNull();
  });
});
