import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import * as screens from './screens.js';

/**
 * Screens and languages arrive when they are needed, not with the application.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * `App.tsx` imported every screen at the top and the locale module held all
 * three languages, so the first download was the whole application: 1,236 kB,
 * 327 kB compressed, for a scholar opening one question on a phone.
 *
 * `scripts/budget.mjs` fails the build when the first download grows past its
 * budget, and it catches a dictionary or a handful of screens. It does not
 * catch one screen, which is six kilobytes and well inside the margin — and
 * one screen at a time is exactly how the first download grew to what it was.
 * This reads the source and finds the one.
 */

const SRC = resolve(process.cwd(), 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/*
 * One separator, whatever the machine writes. On Windows `relative` answers
 * `locales\index.ts`, and every lookup below asks for `locales/index.ts` — so
 * the walk read every file and found none of them.
 */
const sources = files(SRC).map((p) => ({
  path: relative(SRC, p).split(sep).join('/'),
  text: readFileSync(p, 'utf8'),
}));

/* `import X from '…/pages/Y.js'` and `export … from`, the forms that make it static. */
const STATIC_PAGE = /^\s*(?:import|export)\s[^;]*?from\s+['"](?:\.\.?\/)+(?:[\w/]*\/)?pages\/[\w-]+(?:\.js)?['"]/m;

describe('what arrives first', () => {
  it('reads the source it claims to', () => {
    expect(sources.length).toBeGreaterThan(150);
    expect(sources.some((s) => s.path === 'screens.ts')).toBe(true);
    /*
     * A file in a folder, not only one at the top. `screens.ts` sits in the
     * root and so carries no separator at all — it matched on a machine where
     * every nested lookup was already failing, and the file reported itself
     * green while the check below had nothing to read.
     */
    expect(sources.some((s) => s.path === 'locales/index.ts')).toBe(true);
  });

  /*
   * A screen may use a piece of another — the record page draws the rulings
   * list, the library opens a shape — because both are already behind a lazy
   * boundary and the bundler gives them a shared piece. What must not happen is
   * a screen pulled in by the frame or by a component, which is to say by
   * everything.
   */
  it('imports no screen statically, anywhere but through screens.ts or another screen', () => {
    const eager = sources
      .filter((s) => s.path !== 'screens.ts' && !s.path.startsWith('pages/'))
      .filter((s) => STATIC_PAGE.test(s.text))
      .map((s) => s.path);
    expect(eager).toEqual([]);
  });

  it('holds Arabic and Urdu back until chosen', () => {
    const index = sources.find((s) => s.path === 'locales/index.ts')!.text;
    expect(index).not.toMatch(/^\s*import[^;]*from\s+['"]\.\/(?:ar|ur)(?:\.js)?['"]/m);
    expect(index).toMatch(/import\(['"]\.\/ar\.js['"]\)/);
    expect(index).toMatch(/import\(['"]\.\/ur\.js['"]\)/);

    // `all.ts` holds every language at once; only the tests may use it.
    const users = sources
      .filter((s) => s.path !== 'locales/all.ts' && s.path !== 'test-setup.ts')
      .filter((s) => /from\s+['"][./]*locales\/all(?:\.js)?['"]|import\s+['"][./]*locales\/all(?:\.js)?['"]/.test(s.text))
      .map((s) => s.path);
    expect(users).toEqual([]);
  });
});

describe('every screen can be fetched ahead', () => {
  const exported = Object.entries(screens).filter(
    ([, v]) => typeof v === 'object' && v !== null && typeof (v as { preload?: unknown }).preload === 'function',
  );

  it('has a lazy screen for every file in pages/', () => {
    const pages = readdirSync(join(SRC, 'pages'))
      .filter((n) => n.endsWith('.tsx') && !n.includes('.test.'))
      .map((n) => n.replace(/\.tsx$/, ''))
      .sort();
    expect(exported.map(([name]) => name).sort()).toEqual(pages);
  });

  it('fetches every one of them when the browser is idle', () => {
    const idle = new Set(screens.EVERY_SCREEN);
    const missed = exported.filter(([, v]) => !idle.has(v as never)).map(([name]) => name);
    expect(missed).toEqual([]);
    expect(screens.EVERY_SCREEN.length).toBe(exported.length);
  });
});
