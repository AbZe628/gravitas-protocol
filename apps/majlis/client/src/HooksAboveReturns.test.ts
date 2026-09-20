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

/**
 * A return that is not the component's last one.
 *
 * ── the hole this closes, found the hard way ──────────────────────────────
 *
 * This was `/^ {2}(if\s*\(.*\)\s*return\b|return\b)/` — a return on the same
 * line as its `if`, or a bare return at the body's indentation. It does not
 * match the commonest form in React by a wide margin:
 *
 *     if (!open) {
 *       return <Button …/>;
 *     }
 *
 * `  if (!open) {` carries no `return`, and `    return` is four spaces deep.
 * So the guard saw no early return at all in `EnterAHolding`, and two
 * `useState` below one went in under it. Pressing *Enter a holding* threw
 * *rendered more hooks than during the previous render* and blanked the
 * register. The owner found it by pressing the button; this file exists so
 * that nobody has to.
 *
 * Braces are counted instead. Depth 1 is the body, and a `return` there is
 * the component's own — everything after it is unreachable and cannot hold
 * a hook anyway. A `return` at depth 2 or deeper is inside a branch, which
 * is exactly an early return, whichever line the `if` is on.
 */
const RETURNS = /^\s*return\b/;
/** Braces that do not open or close a block: in a string, a regex, a comment. */
const NOT_STRUCTURE = /(['"`]).*?\1|\/\*.*?\*\/|\/\/.*$/g;

/** `export default function Name(` or `function Name(` — a component. */
const COMPONENT = /^(export\s+default\s+)?function\s+[A-Z]/;

/**
 * What actually ends a component, as against what merely starts at column one.
 *
 * ── the fault in this guard ───────────────────────────────────────────────
 *
 * This used to be *any* non-space character at column one. Almost every
 * component here takes destructured props across several lines:
 *
 *     export default function HowThisIsHeld({
 *       asset,
 *     }: {
 *       asset: Asset;
 *     }) {
 *
 * The `}: {` sits at column one, so the guard stopped watching on the third
 * line of nearly every component in the project. It then walked to the end of
 * the file seeing nothing and reported success — and a hook below an early
 * return went in under it, which is the fourth time that fault has shipped.
 *
 * A continuation of a signature — a brace, a bracket, a colon — ends nothing.
 * Only a new declaration does.
 */
const ENDS_IT = /^(export\b|function\b|const\b|let\b|class\b|type\b|interface\b|enum\b|\/\*|\/\/)/;

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
    /*
     * Which components were actually entered. Asserted below, because this
     * guard has already once reported success from a walk that stopped on the
     * third line of nearly every file it opened.
     */
    const walked = new Set<string>();

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      let inComponent = false;
      let returned = 0;
      let depth = 0;
      /** Depth at which a body-level branch opened, or null outside one. */
      let branchAt: number | null = null;

      for (let n = 0; n < lines.length; n++) {
        const line = lines[n];

        if (COMPONENT.test(line)) {
          inComponent = true;
          returned = 0;
          depth = 0;
          branchAt = null;
          walked.add(relative(root, file) + ':' + (n + 1));
        } else if (ENDS_IT.test(line) && !COMPONENT.test(line) && depth === 0) {
          /*
           * Only a new declaration at column one ends the one before it —
           * and only while no block is open, because a `const` at column one
           * inside a component body does not exist, while `}: {` on the
           * third line of a props type most certainly does.
           */
          inComponent = false;
        }
        if (!inComponent) continue;

        /*
         * A return inside a branch of the component's own body.
         *
         * ── two repairs that did not work, and why ───────────────────────
         *
         * Counting brace depth alone over-caught at once:
         * `useState(() => { … return false; })` puts a return at depth 2
         * that has nothing to do with the component, and the guard then
         * reported twenty-odd faults in files that are perfectly correct.
         * A guard that cries wolf gets turned off and protects nothing.
         *
         * Labelling each brace `fn` or `block` failed differently, and the
         * failure is worth keeping written down. This is a real signature
         * in this codebase:
         *
         *     export default function EnterAHolding({ onEntered }: { onEntered: () => void }) {
         *
         * Three braces on one line, and the line contains both `function`
         * and `=>`. Judged per line, every one of them is labelled a
         * function scope, so every component looked like it was permanently
         * inside a nested function and nothing was ever reported. The guard
         * passed, silently, exactly as before the repair.
         *
         * ── what is watched instead ──────────────────────────────────────
         *
         * The one shape that actually causes this fault: a branch opened at
         * the body's own indentation.
         *
         *     if (!open) {          ← two spaces, opens a branch
         *       return …            ← the early return
         *     }
         *
         * Narrow on purpose. It does not try to understand the language; it
         * recognises the thing that has broken this application four times.
         */
        const bare = line.replace(NOT_STRUCTURE, '');
        const opens = (bare.match(/\{/g) ?? []).length;
        const closes = (bare.match(/\}/g) ?? []).length;

        /* A branch at the body's indentation, opening a block on this line. */
        if (branchAt === null && /^ {2}(if|else)\b/.test(line) && opens > closes) {
          branchAt = depth;
        }

        if (RETURNS.test(line) && (branchAt !== null || /^ {2}(if\s*\(.*\)\s*)?return\b/.test(line))) {
          returned = returned || n + 1;
        }

        if (returned && HOOK.test(line) && !line.trim().startsWith('*')) {
          faults.push(
            `${relative(root, file)}:${n + 1} — a hook below the early return on line ${returned}`,
          );
        }

        depth += opens - closes;
        if (depth < 0) depth = 0;
        /* The branch is over when the body's depth comes back to it. */
        if (branchAt !== null && depth <= branchAt) branchAt = null;
      }
    }

    /*
     * Counted, not assumed. 160 is below the 166 this walk enters today and above
     * what a broken walk would find — the version of this guard that stopped
     * at `}: {` entered a small fraction of them and still passed.
     */
    expect(walked.size, 'the walk entered too few components to mean anything').toBeGreaterThan(160);

    expect(faults, faults.join('\n')).toEqual([]);
  });
});
