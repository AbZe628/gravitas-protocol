import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';
import { I18nProvider } from './lib/i18n.js';
import { DESK_DOORS, DOORS, mainOf } from './lib/spine.js';

/**
 * A bank is given its own doors, and never the board's screens.
 *
 * ── what was measured ─────────────────────────────────────────────────────
 *
 * No institution credential was configured anywhere — not in the seed, not in
 * `.env.example`, not in `DEMO.md` — so nobody had ever opened the bank's
 * side of this product. One was generated and used, and what a bank got was
 * the board's entire navigation: seventeen destinations and four doors, every
 * one of them a screen for deciding things a bank does not decide.
 *
 * `/questions` — the board's own triage queue — opened with the instruction
 * *take a question up as a matter, or say why you are not*. `/meetings`
 * offered *convene a sitting*. `/matters` answered in two hundred and
 * eighteen characters whose only heading belonged to the footer. `/holdings`
 * answered in fifty-five and had no heading at all.
 *
 * The acts on those screens were correctly absent. That is the rule working,
 * and it was being applied to controls and never to the screens themselves,
 * so what a bank actually got was a board screen with its contents removed
 * and its instructions left behind.
 *
 * ── what this holds shut ──────────────────────────────────────────────────
 *
 * Every board door's main screen, opened as a bank, says whose it is. Every
 * one of the bank's own doors opens. Both lists are read from `spine.ts`, so
 * a door added there is covered here without anybody remembering to add it —
 * which is the only kind of guard that survives the next screen.
 */

const INSTITUTION = {
  scholarId: 'desk-1',
  role: 'institution',
  office: null,
  outstanding: 0,
  overdue: 0,
  items: [],
};

function json(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/** Answers enough for any screen to render, as a bank. */
function asABank() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/attention')) return json(INSTITUTION);
      if (url.includes('/api/disclosure'))
        return json({ year: 2026, count: 0, events: [], purificationOutstanding: [] });
      if (url.includes('/api/rules')) return json([]);
      if (url.includes('/api/submissions')) return json({ submissions: [], waiting: [] });
      if (url.includes('/api/incidents'))
        return json({ asOf: '2026-09-12', count: 0, awaitingDetermination: 0, overdue: 0, incidents: [] });
      return json({});
    }),
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

describe('the bank has its own way through', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('says whose it is on every board screen', async () => {
    for (const door of DOORS) {
      asABank();
      const { unmount } = open(mainOf(door));

      /*
       * Waited for by name rather than checked on the frame it renders. The
       * identity arrives from `/api/attention` a tick after the first paint,
       * and an assertion that ran before it would pass against any code at
       * all — which is exactly how an earlier guard in this repository came
       * to hold nothing shut.
       */
      const said = await screen.findByText(/this one is the board/i, {}, { timeout: 4000 });
      expect(said, `a bank was shown the board's ${mainOf(door)}`).toBeTruthy();

      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('opens every one of the bank’s own doors', async () => {
    for (const door of DESK_DOORS) {
      asABank();
      const { unmount } = open(mainOf(door));

      /*
       * Asked for by heading rather than by text. Every one of these names
       * also appears in the rail, so a plain text query matches three
       * elements and throws — which is a failure, but not the failure the
       * test is about.
       */
      const head = await screen.findByRole('heading', { level: 1 }, { timeout: 4000 });
      expect(head.textContent?.trim(), `${mainOf(door)} opened with no heading`).toBeTruthy();
      expect(
        head.textContent,
        `the bank was turned away from its own ${mainOf(door)}`,
      ).not.toMatch(/this one is the board/i);

      unmount();
      vi.unstubAllGlobals();
    }
  });
});
