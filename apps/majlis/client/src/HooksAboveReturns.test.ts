import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * No hook below an early return. Three times was enough.
 *
 * ── the fault, and why it keeps happening ─────────────────────────────────
 *
 * React counts hooks. A `useState` or `useEffect` written after
 * `if (!thing) return <Loading />` runs on the renders that get past the
 * guard and not on the ones that do not, the count changes between renders,
 * and React throws *rendered more hooks than during the previous render* —
 * which takes the **whole screen** down to an empty `<div/>`, not just the
 * component that did it.
 *
 * It has happened three times in this repository: `StructureDetail`, then
 * `MatterFlow`, then `IncidentDetail` — the last two on the same day, by the
 * same hand, with the rule already written down. A rule somebody has to
 * remember is a rule that gets forgotten, so this is the rule as a test.
 *
 * ── what it looks for ─────────────────────────────────────────────────────
 *
 * Inside a component — a function whose name starts with a capital — the
 * first `return` that sits at the top level of the body ends the part where
 * hooks may be declared. Anything after it that calls a hook is the fault.
 *
 * Indentation is the measure of *top level* rather than a parser, because a
 * parser here would be a second opinion about a file the compiler has already
 * read. Two spaces means the body of the component; deeper means inside
 * something else, where an early return is nothing to do with hooks.
 */

const HOOK = /\b(useState|useEffect|useRef|useMemo|useCallback|useReducer|useContext|useLayoutEffect|useSearchParams|useParams|useNavigate|useLocation|useI18n|useIdentity|useHealth|useRevision|useNews|useStillThere|useBoardName)\s*[(<]/;

/** `  if (x) return y;` or `  return z;` at the body's own indentation. */
const EARLY_RETURN = /^ {2}(if\s*\(.*\)\s*return\b|return\b)/;

/** `export default function Name(` or `function Name(` — a component. */
const COMPONENT = /^(export\s+default\s+)?function\s+[A-Z]/;

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (path.endsWith('.tsx') && !path.includes('.test.')) out.push(path);
  }
  return out;
}

describe('hooks sit above every early return', () => {
  /*
   * `process.cwd()`, not `import.meta.url`: under jsdom that is not a file URL
   * and resolving it gives `C:\src`. `Reachable.test.tsx` learned the same
   * thing here first.
   */
  const root = join(process.cwd(), 'src');
  const files = filesUnder(root);

  it('reaches the components rather than passing on an empty walk', () => {
    /*
     * The fault a guard in this repository had for weeks: it walked almost
     * nothing and reported success either way.
     */
    expect(files.length).toBeGreaterThan(60);
  });

  it('finds no hook after an early return', () => {
    const faults: string[] = [];

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      let inComponent = false;
      let returned = 0;

      for (let n = 0; n < lines.length; n++) {
        const line = lines[n];

        if (COMPONENT.test(line)) {
          inComponent = true;
          returned = 0;
          continue;
        }
        /* A function at column zero ends the one before it. */
        if (/^\S/.test(line) && !COMPONENT.test(line) && line.trim() !== '') {
          inComponent = false;
        }
        if (!inComponent) continue;

        if (EARLY_RETURN.test(line)) {
          returned = returned || n + 1;
          continue;
        }

        if (returned && HOOK.test(line) && !line.trim().startsWith('*')) {
          faults.push(
            `${relative(root, file)}:${n + 1} — a hook below the return on line ${returned}`,
          );
        }
      }
    }

    expect(faults, faults.join('\n')).toEqual([]);
  });
});
