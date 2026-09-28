import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RAIL_ROUTES } from './lib/spine.js';

/**
 * Nothing was lost when the rail was cut to what was drawn.
 *
 * ── what happened ─────────────────────────────────────────────────────────
 *
 * `design/Main.dc.html` shows three groups and nine destinations. The rail
 * that was built had five groups and seventeen, and the owner rejected the
 * interface twice before anybody opened the drawing. The rail is the drawn one
 * now.
 *
 * Eight destinations left it. Every one still exists at the same address and
 * is reached from the screen it belongs to. **This test is the difference
 * between that sentence being true and being an intention**: if a
 * rearrangement drops one of them out of the application, it fails here.
 *
 * ── why it reads the source rather than rendering ─────────────────────────
 *
 * Rendering each host screen means stubbing whatever each one fetches, and a
 * guard that is expensive to keep working is a guard somebody eventually
 * deletes. What is asserted here is narrow and exact: a link to this address
 * is written somewhere a person can reach. `Guided.test.tsx` renders the rail
 * itself and checks the nine, so the two together cover both halves.
 *
 * It does not prove the link is reachable on the screen a member is looking
 * at. A route that is linked only from a page nothing opens would pass. That
 * is the known limit, and it is written down rather than implied.
 */

/*
 * From the working directory, not from `import.meta.url`.
 *
 * Under jsdom that URL is not a file URL at all, and taking its pathname by
 * hand produced `C:\src`. Vitest runs from the client package, so this is both
 * simpler and right on either platform — and the existence check below means a
 * wrong guess fails loudly instead of scanning nothing and passing.
 */
const SRC = join(process.cwd(), 'src');

function everySourceFile(dir: string, found: string[] = []): string[] {
  if (!existsSync(dir)) throw new Error(`no such source directory: ${dir}`);
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      everySourceFile(path, found);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

/** Every address linked to anywhere in the application, spine.ts excluded. */
function addressesLinked(): Set<string> {
  const out = new Set<string>();

  for (const file of everySourceFile(SRC)) {
    /*
     * Neither the spine nor the route table is a way in.
     *
     * `spine.ts` was excluded from the first day: it is the data the rail is
     * drawn from, and a destination listed there is not thereby on anybody's
     * screen. `App.tsx` had to join it, and the reason is a fault this guard
     * sat through: the briefings lost their only link, and the test passed,
     * because `<Route path="/briefings">` is a string literal on a line of
     * code and satisfied the match. A route proving its own reachability is
     * a guard that guards nothing.
     */
    if (file.endsWith(join('lib', 'spine.ts'))) continue;
    if (file.endsWith(join('src', 'App.tsx'))) continue;
    const source = readFileSync(file, 'utf8');

    /*
     * An address in a place that makes it a link, and nowhere else.
     *
     * Any string literal was too loose, and the guard sat through the fault
     * it exists for: the briefings lost their only link and every one of
     * these still matched — the route table, the list of routes given the
     * full width, and a key in the journey table. None of the three is a
     * control anybody can press.
     *
     * Any string literal was chosen because two of the links come from a
     * table and render as `to={to}`, so the address is never beside the
     * attribute. Both forms are matched here instead: the attribute, and a
     * tuple whose first element is the address — which is what such a table
     * looks like, and what a bare list of routes does not.
     *
     * A form nobody thought of is missed, and the guard then names a route
     * as unreachable when it is not. That is the direction to be wrong in.
     *
     * And the third form, a line of a grouped list: `{ to: '/questions',
     * label }` handed to `Rows`, which draws each as a link. It is the key
     * `to` and nothing looser — a bare list of routes still does not count.
     */
    for (const line of source.split(/\r?\n/)) {
      const code = line.trim();
      if (code.startsWith('*') || code.startsWith('//') || code.startsWith('/*')) continue;

      for (const m of code.matchAll(/(?:\bto|\bhref)\s*[=:]\s*[{(]?\s*['"`](\/[A-Za-z0-9\-/]*)['"`]/g)) {
        out.add(m[1]);
      }
      for (const m of code.matchAll(/\[\s*['"`](\/[A-Za-z0-9\-/]*)['"`]\s*,/g)) {
        out.add(m[1]);
      }
    }
  }
  return out;
}

/**
 * The eight, and where each one went.
 *
 * Kept as a table rather than a list so a failure says what was supposed to
 * hold it, which is the thing somebody needs in order to put it back.
 */
const MOVED: readonly { route: string; nowReachedFrom: string }[] = [
  { route: '/calculations', nowReachedFrom: 'the Tools panel in the bar' },
  { route: '/questions', nowReachedFrom: 'the arrival queue' },
  { route: '/classic', nowReachedFrom: 'the arrival queue' },
  { route: '/ask', nowReachedFrom: 'the questions queue, and the phone masthead' },
  { route: '/check', nowReachedFrom: 'the contract library' },
  { route: '/meetings', nowReachedFrom: 'Coming' },
  { route: '/undertakings', nowReachedFrom: 'Coming' },
  { route: '/examinations', nowReachedFrom: 'Coming' },
  { route: '/briefings', nowReachedFrom: 'The record' },
  { route: '/settings', nowReachedFrom: "the member's own name in the header" },
];

describe('the rail is the one that was drawn', () => {
  it('offers eight destinations, in three groups', () => {
    expect(RAIL_ROUTES).toHaveLength(8);
    expect([...new Set(RAIL_ROUTES)]).toHaveLength(8);
  });

  it('offers exactly what the drawing offers', () => {
    expect([...RAIL_ROUTES].sort()).toEqual(
      [
        '/',
        '/calendar',
        '/incidents',
        '/library',
        '/record',
        '/register',
        '/rules',
        '/search',
      ].sort(),
    );
  });
});

describe('nothing was lost when it was cut', () => {
  const linked = addressesLinked();

  for (const { route, nowReachedFrom } of MOVED) {
    it(`${route} is still linked, from ${nowReachedFrom}`, () => {
      expect(
        linked.has(route),
        `${route} left the rail and nothing links to it. It was meant to be reached from ${nowReachedFrom}.`,
      ).toBe(true);
    });
  }

  /*
    What the scanner must not find, which is the half that was missing.

    The old claim here was that a scanner matching nothing would pass the
    cases above by accident. It would not — every one of them asserts a
    route *is* linked, so a scanner that found nothing fails ten times. The
    danger was always the other direction, and the other direction is what
    happened: a scanner matching every string literal called the route table
    a link, and the briefings sat unreachable behind a green test.

    `/guided` is the probe, and it is a good one because the application
    means it: the arrival the queue replaced, kept at its address so an old
    bookmark still opens, deliberately linked from nowhere. A scanner that
    reports it as linked is reading the route table again.
  */
  it('is not fooled by the route table', () => {
    expect(linked.has('/guided')).toBe(false);
    expect(linked.has('/more')).toBe(false);
  });

  it('found every address it was asked about, and then some', () => {
    for (const { route } of MOVED) expect(linked.has(route)).toBe(true);
    expect(linked.size).toBeGreaterThan(MOVED.length);
  });
});
