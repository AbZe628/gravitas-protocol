import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import Shell from './components/Shell.js';
import { RAIL } from './lib/spine.js';
import { DICTIONARIES } from './locales/index.js';

/**
 * A phone is shown less at once than a desk. It is never shown less in total.
 *
 * ── what was measured ─────────────────────────────────────────────────────
 *
 * Walking the running application at 375 pixels and again at 1440, following
 * only what is visible: **thirty-three addresses against thirty-six**. The
 * rail is the navigation and the rail is `lg:block`, so below a desk the only
 * navigation was the tab bar — and the tab bar carries one destination per
 * group, because five tabs is what fits across a phone. A member who tapped
 * a tab landed on that group's main screen and the rest of the group was
 * reachable from nowhere at all.
 *
 * Four of the eight: *what went wrong*, *the record*, *the contract library*,
 * and — from outside the rail entirely — *put a question*, which is the one
 * act a secretary taking an enquiry by telephone actually needs and which had
 * no way in on a phone at all.
 *
 * ── what holds it ─────────────────────────────────────────────────────────
 *
 * Under the masthead, the group the member is standing in, scrolling
 * sideways. Not a drawer holding the desktop rail: the artboard note says in
 * as many words that a phone is not a small desktop. The same groups, the
 * same order, the same words, narrowed to where the member already is.
 *
 * ── and why this counts rather than looks ─────────────────────────────────
 *
 * jsdom applies no stylesheet, so `lg:hidden` hides nothing here and both the
 * phone's row and the desk's rail are in the document. That is why every
 * assertion below is scoped to the row **by its own label** and why the last
 * one counts: eight of eight, so a group quietly dropping out of the row
 * fails rather than passing for want of being looked at.
 *
 * The running application is measured separately, by walking it at three
 * widths. Hiding this row there moved the count from thirty-six back to
 * thirty-three, which is how the guard was shown to catch.
 */

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.includes('/api/health'))
        return json({
          ok: true,
          stage: 2,
          governanceWrites: true,
          signingAuthority: false,
          recordSince: null,
          enforcement: 'none',
          assistantKind: 'off',
          documents: 'none',
          reading: 'off',
          notice: 'none',
        });
      if (url.includes('/api/attention'))
        return json({
          scholarId: 'member-a',
          role: 'signatory',
          office: null,
          outstanding: 0,
          overdue: 0,
          items: [],
        });
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

const en = DICTIONARIES.en;
const THE_GROUP = en['shell.thisGroup'];

async function standingAt(path: string) {
  stub();
  render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <Shell>
          <div />
        </Shell>
      </I18nProvider>
    </MemoryRouter>,
  );
  /* The frame reads the installation before it draws; wait for that. */
  await screen.findAllByText(/Nothing here signs/);
  return screen.getByRole('navigation', { name: THE_GROUP });
}

describe('the group a member is standing in, on a phone', () => {
  it('carries every destination of that group, not only the one tapped', async () => {
    const row = await standingAt('/');
    const work = RAIL[0].destinations.map((d) => en[d.label]);

    for (const name of work) {
      expect(within(row).getByRole('link', { name }), name).toBeInTheDocument();
    }
    expect(within(row).getAllByRole('link')).toHaveLength(work.length);
  });

  it('follows the member from one group to the next', async () => {
    const row = await standingAt('/register');

    /* Standing in *what we hold*, the row is that group and not the first. */
    expect(within(row).getByRole('link', { name: en['rail.library'] })).toBeInTheDocument();
    expect(within(row).queryByRole('link', { name: en['rail.events'] })).toBeNull();
  });

  it('keeps the group when a screen below a destination is open', async () => {
    /*
     * A contract shape sits under the library and has no rail entry of its
     * own. The match is the longest destination the path begins with, so
     * opening one must not drop the member out of the navigation.
     */
    const row = await standingAt('/library/murabaha');
    expect(within(row).getByRole('link', { name: en['rail.library'] })).toBeInTheDocument();
  });

  it('reaches all eight, which is the whole rail', async () => {
    /*
     * The coverage assertion. Each group's main is what the tab bar offers,
     * so this walks the phone the way a member does — tap a tab, read the
     * row — and counts what that reaches. Eight is every destination the
     * rail draws; anything less is a screen with no way in.
     */
    const reached = new Set<string>();

    for (const group of RAIL) {
      const main = group.destinations.find((d) => d.main) ?? group.destinations[0];
      const row = await standingAt(main.to);
      for (const link of within(row).getAllByRole('link')) {
        reached.add(link.getAttribute('href') ?? '');
      }
      screen.getByRole('navigation', { name: THE_GROUP }); // the row was real
      document.body.innerHTML = '';
    }

    for (const group of RAIL) {
      for (const d of group.destinations) {
        expect(reached.has(d.to), d.to).toBe(true);
      }
    }
    expect(reached.size).toBe(RAIL.flatMap((g) => g.destinations).length);
  });
});

describe('putting a question, on a phone', () => {
  it('is in the masthead, because it belongs to no screen', async () => {
    await standingAt('/');

    /*
     * Two copies, as with everything the frame says twice: the wide bar
     * writes the words, the masthead carries the mark with the words as its
     * label. One would mean a width had been left without it — which is
     * exactly what was measured before this.
     */
    expect(screen.getAllByRole('link', { name: en['door.asked.put'] })).toHaveLength(2);
  });
});
