import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { translate } from './locales/index.js';

/**
 * Every key the screens ask for is a key the dictionary has.
 *
 * ── the fault this closes ─────────────────────────────────────────────────
 *
 * `translate` ends with `?? key`. A key that exists nowhere renders as
 * itself, so a screen prints `queue.nothing` — developer text, in the place a
 * sentence should be.
 *
 * That is exactly what the arrival screen did in its empty state. `Queue.tsx`
 * asks for `queue.nothing` and `queue.noneHere`; neither has ever existed in
 * any of the three dictionaries. A board with an empty queue — which is every
 * board on its first day — was shown a variable name.
 *
 * ── why the tests that exist did not catch it ─────────────────────────────
 *
 * `Locales.test.ts` compares the three dictionaries against each other: every
 * English key present in Arabic and Urdu, nothing empty, nothing falling back.
 * All three agreed perfectly about a key none of them had. Agreement between
 * dictionaries says nothing about what the code asks for.
 *
 * ── what cannot be checked, said out loud ─────────────────────────────────
 *
 * A key built at runtime — `t(\`needs.kind.\${row.kind}\`)` — cannot be read
 * from the source, and this counts how many of those it had to skip rather
 * than passing over them in silence. A guard that does not say what it missed
 * is a guard that can quietly stop covering anything.
 */

/**
 * A dotted literal on a line that calls `t`.
 *
 * Not `t('key')` alone. The first version of this matched only the whole
 * argument, and walked straight past
 * `t(rows.length === 0 ? 'queue.nothing' : 'queue.noneHere')` — which is
 * exactly where the two missing keys were. A guard aimed at one shape of a
 * call misses every other shape, silently.
 *
 * Wider catches more, including the odd dotted string that is not a key. One
 * of those would be reported as missing and seen at once, which is a better
 * failure than a quiet miss.
 */
const LITERAL = /'([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)'/g;

/** `t(`some.${thing}`)` — built while running, and not readable from here. */
const BUILT = /\bt\(\s*`/g;

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (/\.tsx?$/.test(path) && !path.includes('.test.') && !path.includes('locales'))
      out.push(path);
  }
  return out;
}

describe('every key a screen asks for exists', () => {
  const root = join(process.cwd(), 'src');
  const files = filesUnder(root);

  const asked = new Map<string, string>();
  let built = 0;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    built += [...text.matchAll(BUILT)].length;
    for (const line of text.split('\n')) {
      if (!line.includes('t(')) continue;
      for (const m of line.matchAll(LITERAL)) {
        if (!asked.has(m[1])) asked.set(m[1], relative(root, file));
      }
    }
  }

  it('reads enough keys out of the screens to mean anything', () => {
    /*
     * Counted, not guessed. A walk that finds a handful and passes is the
     * failure this repository has already had twice — see the note on
     * coverage in `HooksAboveReturns`.
     */
    expect(asked.size).toBeGreaterThan(700);
  });

  it('finds no key that renders as its own name', () => {
    const missing: string[] = [];
    for (const [key, where] of asked) {
      /* `translate` returns the key itself when it has nothing. */
      if (translate('en', key) === key) missing.push(`${key}  (asked by ${where})`);
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('says how many keys are built at runtime and cannot be checked here', () => {
    /*
     * Not an assertion about the code — an assertion that this guard knows
     * the size of its own blind spot. If this number climbs, more of the
     * application is beyond what a literal scan can see, and the blind spot
     * needs covering another way.
     */
    expect(built).toBeLessThan(150);
  });
});
