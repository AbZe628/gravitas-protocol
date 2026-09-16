import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * An act that fails must say so. It may not report success.
 *
 * ── the fault ─────────────────────────────────────────────────────────────
 *
 * `Act` — the window a member presses through — knows an act went wrong by
 * the promise it was handed rejecting. On a rejection the window stays open,
 * prints what the server said, and keeps everything typed into it. On a
 * resolution it closes and prints *what is now true*.
 *
 * So a handler that catches its own failure and returns normally hands the
 * window a promise that kept its word. Putting a question to the board did
 * exactly this: the network refused, the handler swallowed the refusal into
 * its own `error` state — drawn on the page *behind* the window, where nobody
 * looks — and the window announced **The question is with the board** over
 * the top of it. The member reads that the board has their question, closes
 * the screen, and the board has nothing.
 *
 * A screen that is merely broken wastes a minute. A screen that lies is
 * believed, and this one is believed about whether a question was ever asked.
 *
 * Every test in this suite was green while it happened, because a test that
 * mounts a component and reads the sentence it was passed cannot tell that
 * the sentence is false.
 *
 * ── what it looks for ─────────────────────────────────────────────────────
 *
 * The functions a screen names in `perform={...}`, and whether any of them
 * catches without throwing again. Catching is fine — there are good reasons
 * to clean up, or to turn one error into a clearer one — as long as the
 * failure still leaves the function.
 *
 * Indentation marks the function's body, as in `HooksAboveReturns`: a parser
 * here would be a second opinion about a file the compiler has already read.
 */

/** `perform={put}` or `perform={() => decline(why)}` — the name it calls. */
const PERFORM = /perform=\{\s*(?:\([^)]*\)\s*=>\s*)?([a-z][A-Za-z0-9]*)/g;

/** `async function name(` or `function name(` at the component's own indent. */
const named = (name: string) =>
  new RegExp(`^ {2}(?:async\\s+)?function\\s+${name}\\s*\\(`);

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (path.endsWith('.tsx') && !path.includes('.test.')) out.push(path);
  }
  return out;
}

/**
 * The lines of one function, from its opening to the line that closes it.
 *
 * The closing line is the first `  }` at the function's own indentation, which
 * is what ends a function declared in a component body.
 */
function bodyOf(lines: string[], from: number): string[] {
  const out: string[] = [];
  for (let n = from + 1; n < lines.length; n++) {
    if (/^ {2}\}/.test(lines[n])) break;
    out.push(lines[n]);
  }
  return out;
}

describe('an act that fails refuses, and never reports success', () => {
  const root = join(process.cwd(), 'src');
  const files = filesUnder(root);

  it('reaches the screens that perform acts', () => {
    /*
     * The guard this repository already had that watched two routes out of
     * seventy-four and passed either way. A walk that finds nothing must fail
     * rather than agree.
     *
     * Eight is counted, not guessed — the first figure written here was *more
     * than eight* from memory, and there were exactly eight. The number only
     * rises as the remaining acts get their windows, so a fall means a screen
     * lost one.
     */
    const performing = files.filter((f) => readFileSync(f, 'utf8').includes('perform='));
    expect(performing.length).toBeGreaterThanOrEqual(8);
  });

  it('finds no handler that swallows its own refusal', () => {
    const faults: string[] = [];

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (!text.includes('perform=')) continue;

      const lines = text.split('\n');
      const names = new Set([...text.matchAll(PERFORM)].map((m) => m[1]));

      for (const name of names) {
        const at = lines.findIndex((l) => named(name).test(l));
        if (at < 0) continue;

        const body = bodyOf(lines, at);
        const catches = body.some((l) => /\}\s*catch\s*\(/.test(l) || /^\s*catch\s*\(/.test(l));
        if (!catches) continue;

        /* Caught, and let go again — the window still learns of it. */
        const rethrows = body.some((l) => /^\s*throw\b/.test(l));
        if (rethrows) continue;

        faults.push(
          `${relative(root, file)} — ${name}() catches its own failure and returns ` +
            `normally, so the window will report success on a refusal`,
        );
      }
    }

    expect(faults).toEqual([]);
  });
});
