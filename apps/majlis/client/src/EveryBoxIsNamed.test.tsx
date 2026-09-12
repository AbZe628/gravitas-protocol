import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Nothing in this application asks a person to fill in an unnamed box.
 *
 * ── what a missing name costs ─────────────────────────────────────────────
 *
 * Every box here sat under a heading, so on screen it read correctly and the
 * fault was invisible. Underneath, the heading was not joined to the box, and
 * three things followed.
 *
 * A member reading with a screen reader landed on a box the machine could not
 * name. Pressing the heading did not put the cursor in the box, which every
 * other application they use does. And a test could not ask for the box by
 * name — which is how this was found. A test written to prove that a failed
 * refresh keeps the screen looked for the reason box by its heading, did not
 * find it, quietly carried on, left the act disabled, pressed it to no effect
 * and reported that it passed. It would have passed against any code at all.
 *
 * So this is not a matter of etiquette. An unnamed box makes the screen it is
 * on untestable, and an untestable screen is one nothing is holding shut.
 *
 * ── the four ways a box gets a name ───────────────────────────────────────
 *
 * `aria-label`, `aria-labelledby`, an `id` a heading points at, or sitting
 * inside a `<label>` element. A spread — `{...attrs}` — counts, because that
 * is `Field` handing over the identifier it made.
 *
 * A hidden file chooser is skipped: it is not in the accessibility tree, no
 * one ever reaches it, and the visible button standing in front of it carries
 * the words.
 *
 * ── this test was proved by breaking the code ─────────────────────────────
 *
 * With the heading in `Questions.tsx` unhooked from its box, this test named
 * that file and that line and failed. A guard nobody has watched fail is not
 * a guard.
 */

/** This file's own directory, which is the whole of `src`. */
const SRC = dirname(fileURLToPath(import.meta.url));

function everyScreen(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...everyScreen(path));
    else if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) out.push(path);
  }
  return out;
}

/** Every control in the file that nothing gives a name to, as file:line. */
function unnamedIn(path: string): string[] {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const found: string[] = [];
  let labelDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/<label(\s|>|$)/g) || []).length;
    const closes = (line.match(/<\/label>/g) || []).length;

    if (/<(input|textarea|select)(\s|>|$)/.test(line)) {
      // The opening tag can run over several lines; read until it closes.
      let tag = '';
      for (let j = i; j < Math.min(lines.length, i + 25); j++) {
        tag += lines[j] + '\n';
        const end = lines[j].trim();
        if (end.endsWith('/>') || end.endsWith('>')) break;
      }

      const skip = /\shidden\b|type="hidden"/.test(tag);
      const named =
        /aria-label|aria-labelledby|\sid=|\{\.\.\./.test(tag) || labelDepth + opens > 0;

      if (!skip && !named) {
        found.push(path.split(/[\\/]/).slice(-2).join('/') + ':' + (i + 1));
      }
    }

    labelDepth = Math.max(0, labelDepth + opens - closes);
  }
  return found;
}

describe('every box a person fills in can be named', () => {
  it('no control anywhere is left without one', () => {
    const unnamed = everyScreen(SRC).flatMap(unnamedIn);

    expect(unnamed, `these boxes have no name:\n  ${unnamed.join('\n  ')}`).toEqual([]);
  });
});
