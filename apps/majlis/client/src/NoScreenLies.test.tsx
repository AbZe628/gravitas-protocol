import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * No screen claims a failure it has not had, on any address in the application.
 *
 * ── the fault this exists to stop coming back ─────────────────────────────
 *
 * The matter pack held its assembled parts in one state that started at null,
 * and read null as "could not be assembled". The matter and the pack are two
 * requests and the pack is the slower — five services feed it — so for the
 * moment in between, every member who opened a matter was told
 *
 *     The pack could not be put together just now.
 *
 * and then watched that sentence replace itself with six parts of content. It
 * was never caught by a test because every test awaits the settled state, and
 * it was never caught by reading the code because the line reads correctly:
 * it is only wrong about *when* it is shown.
 *
 * ── how it is caught ──────────────────────────────────────────────────────
 *
 * Every route is opened against a server that never answers. That is the state
 * a screen is in for its first frames on a real network, held still. In it a
 * screen may say it is loading, and may show whatever needs no request. It may
 * not say a request failed, and it may not say the board has nothing — because
 * neither has been established, and both are claims about the bank rather than
 * about the connection.
 *
 * That sweep alone would not have caught the pack, because with nothing
 * answering the pack never gets as far as its own sentence. The fault needs
 * one request answered and another still out, which is the ordinary case on a
 * real network and is the last test in this file.
 */

/** What no screen may say before its request has answered. */
const LIES = [
  /could not load/i,
  /could not be put together/i,
  /nothing is waiting/i,
  /no meeting has been recorded/i,
  /nothing has been asked/i,
  /has not been recorded/i,
  /never looked at/i,
];

const ROUTES = [
  '/',
  '/questions',
  '/examinations',
  '/ask',
  '/matters/matter-1',
  '/classic/matters/matter-1',
  '/classic',
  '/register',
  '/register/asset-1',
  '/rules',
  '/classic/rules',
  '/library',
  '/calculations',
  '/calendar',
  '/meetings',
  '/meetings/meeting-1/book',
  '/undertakings',
  '/incidents',
  '/incidents/incident-1',
  '/briefings',
  '/assistant',
  '/search',
  '/record',
  '/classic/record',
  '/settings',
];

function silent() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
}

function open(path: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('no screen claims a failure it has not had', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  for (const path of ROUTES) {
    it(`${path} says nothing it cannot know yet`, async () => {
      silent();
      const { container } = open(path);

      // Give the screen the frames it would use to settle, if it could.
      await waitFor(() => {
        expect(container.textContent).toBeTruthy();
      });

      for (const lie of LIES) {
        expect(container.textContent ?? '').not.toMatch(lie);
      }
    });
  }

  /*
   * The counterpart. A screen that says nothing at all while it waits is the
   * other half of the same fault: a person cannot tell a slow request from a
   * finished one with nothing in it. The rail is always there, so this asks
   * for the word inside the page.
   */
  it('a screen that is waiting says so', async () => {
    silent();
    open('/register');
    expect(await screen.findByText(/Loading/i)).toBeTruthy();
  });

  /*
   * A 200 of the wrong shape must not empty the screen.
   *
   * `VotePanel` read `tally.outstanding.length` on a body that carried no
   * `outstanding`, threw inside render, and React unmounted the whole tree: a
   * member pressed into a matter and got a white page — the vote, the pack and
   * the proposal all gone over one absent field. An older server, a proxy's
   * error page and a half-deployed API all produce exactly this.
   *
   * Every route is opened against a server that answers `{}` to everything.
   * The screen may say whatever it likes about what it got; it may not
   * disappear.
   */
  for (const path of ROUTES) {
    it(`${path} survives a 200 with nothing in it`, async () => {
      const thrown: unknown[] = [];
      const onError = (e: ErrorEvent) => thrown.push(e.error ?? e.message);
      window.addEventListener('error', onError);

      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ),
      );

      const { container } = open(path);
      await waitFor(() => {
        expect(container.textContent).toBeTruthy();
      });
      // Settled, so a later render cannot throw after the assertion.
      await new Promise((r) => setTimeout(r, 0));

      window.removeEventListener('error', onError);
      expect(thrown).toEqual([]);
      expect(container.textContent).toBeTruthy();
    });
  }

  /*
   * The pack, at the speed it actually runs.
   *
   * The matter answers and the pack does not, which is the ordinary case: one
   * read against one store, against an assembly over five services. The screen
   * has the matter, so it renders — and this is the frame in which it used to
   * announce that the pack could not be put together.
   */
  it('the matter pack waits for the pack instead of declaring it lost', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/pack')) return new Promise<Response>(() => {});
        const body = url.includes('/api/matters/')
          ? {
              id: 'matter-1',
              boardId: 'demo-board',
              title: 'A matter whose pack is slow',
              proposal: 'The proposal, which belongs to the matter and not to the pack.',
              origin: 'institution_request',
              direction: 'restrict',
              status: 'voting',
              openedAt: '2026-08-11T00:00:00.000Z',
              timelockEndsAt: null,
              notDecided: [],
              mechanism: '',
              interactsWith: [],
              proposedRule: null,
              simulation: null,
              deliberation: [],
              reasoning: [],
              objections: [],
              inForceAt: null,
              sources: [],
            }
          : {};
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    open('/matters/matter-1');

    // The matter is there, so the screen has rendered rather than still loading.
    expect(await screen.findByText('A matter whose pack is slow')).toBeTruthy();

    /*
     * Read from the document rather than the render container, and waited for
     * rather than asserted once: the pack's placeholder is painted in the
     * render after the matter's, and reading between the two made this flaky.
     */
    await waitFor(() => {
      expect(document.body.textContent ?? '').toMatch(/Loading/i);
    });
    expect(document.body.textContent ?? '').not.toMatch(/could not be put together/i);
  });
});
