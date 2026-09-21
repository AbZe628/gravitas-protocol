import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Three things this application cannot do by itself.
 *
 * Reading a document with a model needs **a key**, which is the
 * institution's and never ours. Telling anyone outside needs **a relay**,
 * which is the bank's. Writing to the registry needs **the owner's
 * signature** on a contract. A bank that has wired none of them has the
 * ordinary installation, not a broken one.
 *
 * ── the rule, which is older than this file ───────────────────────────────
 *
 * **While a capability is absent there is no button for it, and the screen
 * says what is missing.** A control that can only refuse is worse than no
 * control: it teaches a member that the application is unreliable, when
 * what is true is that their institution has not turned something on.
 *
 * ── why a guard and not a walk ────────────────────────────────────────────
 *
 * A probe was written first: it opened the bare installation, pressed all
 * eighty-one buttons across twenty-three screens, and watched for the
 * server refusing with `reading_off` or `no_vault`. It reported nothing —
 * and it reported nothing **after a real fault was injected into it**,
 * because reaching `/extract` takes three presses and a dropdown, and the
 * probe pressed once. A measure that cannot see the fault it exists for is
 * not a measure, however green.
 *
 * So the question is asked where it can be answered completely: **every
 * call to a capability route is in a file that consults the health of the
 * installation.** A fourth call site added tomorrow without one fails here
 * on the day it is added.
 *
 * ── what this does not claim ──────────────────────────────────────────────
 *
 * That the guard is *correct* — that it checks the right field, and hides
 * rather than disables. That is each component's own test, and those exist.
 * What this holds is that the question was asked at all, which is the part
 * a new call site silently skips.
 */

/** This file's own directory, which is the whole of `src`. */
const SRC = dirname(fileURLToPath(import.meta.url));

/**
 * The three, and the field of `/api/health` that says whether each is here.
 *
 * Named by the client function rather than by the URL: a call site reaches
 * for the function, and a URL assembled in `api.ts` is invisible from the
 * screen that uses it.
 */
const OUTSIDE = [
  { needs: 'a reading assistant', calls: 'readDocument(', field: 'reading' },
  { needs: 'somewhere to keep a document', calls: 'attachDocument(', field: 'documents' },
  { needs: 'an assistant', calls: 'api.ask(', field: 'assistantKind' },
] as const;

/**
 * The screens, and only the screens.
 *
 * `lib/` defines these calls and `locales/` names them in a translation —
 * neither renders a control, and the health of an installation is not
 * their business. A first pass scanned everything and failed on
 * `"evidence.attachDocument": "Attach a document"`, which is a sentence.
 */
function everyScreen(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...everyScreen(path));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const SCREENS = () => [...everyScreen(join(SRC, 'components')), ...everyScreen(join(SRC, 'pages'))];

/** The file's own name, as it would be read in a failure. */
const shortly = (path: string) => path.split(/[\\/]/).slice(-2).join('/');

describe('nothing is offered that this installation cannot do', () => {
  for (const { needs, calls, field } of OUTSIDE) {
    it(`every call that needs ${needs} sits behind a look at the health`, () => {
      const callers = SCREENS().filter((path) => readFileSync(path, 'utf8').includes(calls));

      /*
       * Coverage, asserted. A guard that walked nothing passes, and this
       * project has been caught by that four times: green has meant "I
       * never reached it" more often than it has meant anything else.
       */
      expect(callers.length, `nothing at all calls ${calls} — has it been renamed?`).toBeGreaterThan(0);

      const unguarded = callers.filter((path) => {
        const source = readFileSync(path, 'utf8');
        return !source.includes('useHealth') || !source.includes(field);
      });

      expect(
        unguarded.map(shortly),
        `these reach for ${needs} without asking whether this installation has one:\n  ` +
          unguarded.map(shortly).join('\n  '),
      ).toEqual([]);
    });
  }

  it('walked all three, so a capability dropped from the list fails here', () => {
    /*
     * The list itself is the thing that rots. A fourth capability added to
     * the application and not to this list would be guarded by nothing,
     * and the file would still be green — so the count is written down.
     */
    expect(OUTSIDE).toHaveLength(3);
  });
});
