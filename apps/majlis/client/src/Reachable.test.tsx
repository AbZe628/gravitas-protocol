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
    if (file.endsWith(join('lib', 'spine.ts'))) continue;
    const source = readFileSync(file, 'utf8');

    /*
     * Any address written as a string, on a line that is not a comment.
     *
     * Matching only `to="/x"` was too narrow and the guard said so on its
     * first run: two of the links it was looking for are built from a table
     * and rendered as `to={to}`, so the address never appears next to the
     * attribute. Comment lines are dropped because an address named in prose
     * is not a way in, and this test exists to tell those two apart.
     */
    for (const line of source.split(/\r?\n/)) {
      const code = line.trim();
      if (code.startsWith('*') || code.startsWith('//') || code.startsWith('/*')) continue;

      for (const m of code.matchAll(/['"`](\/[A-Za-z0-9\-/]*)['"`]/g)) {
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

  it('found enough links to be sure it was actually looking', () => {
    // A scanner that matched nothing would pass every case above by accident.
    expect(linked.size).toBeGreaterThan(15);
  });
});
