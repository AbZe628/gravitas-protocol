import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import Shell from './components/Shell.js';
import { RAIL } from './lib/spine.js';
import { DICTIONARIES } from './locales/index.js';

/**
 * The bar at the foot of a phone, and what it says about where you are.
 *
 * ── the two faults this holds shut ────────────────────────────────────────
 *
 * **One tab lit and two never did.** The tabs are the three groups of the
 * rail; the lighting compared each tab's drawing to the *phase* of the
 * path, and the phases are the four doors — a different division of the
 * same application. "What stands" lit because its drawing happens to be
 * named `inforce` and `/rules` is in the In force door. "What we hold"
 * never lit at all, because the register is in that same door and the
 * names did not match. A member standing on a screen was told they were
 * nowhere.
 *
 * **And the guide did nothing.** Its panel was mounted inside the desk's
 * wide bar, which is `hidden` below 1024 pixels, so on a phone the
 * component never rendered and the listener the tab shouts at was never
 * attached. Pressing the tab did nothing at all, on every screen.
 *
 * Both were reported by the owner after using it, which is the point: a
 * suite of 450 tests had nothing to say about either.
 */

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

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
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      return json({});
    }),
  );
}

const en = DICTIONARIES.en;

function standingAt(path: string) {
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
  /*
   * The bar is the one navigation labelled *open the navigation*, and
   * jsdom applies no stylesheet so the desk's rail is in the document
   * too. Scoped by label, as everywhere else in this suite.
   */
  return screen.getByRole('navigation', { name: en['shell.menu'] });
}

const lit = (bar: HTMLElement) =>
  within(bar)
    .queryAllByRole('link', { current: 'page' })
    .map((a) => a.textContent?.trim() ?? '');

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('which tab is lit', () => {
  it('lights the group a member is standing in, for every destination the rail draws', async () => {
    for (const [i, group] of RAIL.entries()) {
      for (const d of group.destinations) {
        const bar = standingAt(d.to);
        expect(lit(bar), d.to).toEqual([en[RAIL[i].label]]);
        document.body.innerHTML = '';
      }
    }
  });

  it('keeps the group when a screen under a destination is open', async () => {
    const bar = standingAt('/library/murabaha');
    expect(lit(bar)).toEqual([en['rail.hold']]);
  });

  it('lights the work for a matter, which belongs to no destination', async () => {
    /*
     * A matter is opened from the queue and a member has not left it.
     * With nothing matched, all three tabs went dark at once.
     */
    const bar = standingAt('/matters/m1');
    expect(lit(bar)).toEqual([en['rail.work']]);
  });

  it('lights exactly one, never two', async () => {
    for (const path of ['/', '/rules', '/register', '/questions', '/calendar', '/check']) {
      const bar = standingAt(path);
      expect(lit(bar).length, path).toBe(1);
      document.body.innerHTML = '';
    }
  });
});

describe('the guide', () => {
  it('is in the document on a phone, so its tab has something to open', async () => {
    standingAt('/');

    /*
     * The panel listens for an event the tab dispatches. Mounted inside
     * the desk's bar it was never rendered below 1024 pixels — and a
     * listener that is not attached cannot be pressed.
     */
    const bar = screen.getByRole('navigation', { name: en['shell.menu'] });
    const opens = within(bar).getByRole('button', { name: en['guide.open'] });
    expect(opens).toBeInTheDocument();

    opens.click();
    expect(await screen.findByText(en['guide.title'])).toBeInTheDocument();
  });
});
