import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * A column of states is not a traffic report.
 *
 * ── what was measured ─────────────────────────────────────────────────────
 *
 * On the arrival screen, in one list: **four** accent colours. Lapis on
 * *Everything* and *Take it* and *Question*, green on *Review*, gold on
 * *Matter* and *Undertaking*, red on *past its date* and *Non-compliance*.
 * Every one of them painted a word that already said the same thing — so a
 * column of eleven stages read as a signal of its own, and the one thing
 * worth finding in a list without reading it, what is late, was one colour
 * among four.
 *
 * ── the rule ──────────────────────────────────────────────────────────────
 *
 * A mark is a word. Colour on it is the exception, not the default:
 *
 *   - **red** where a clock has run out, or the record says this may not be
 *     held — the one thing a member should find by sweeping;
 *   - **lapis** on what a member presses, which is not a mark;
 *   - everything else neutral.
 *
 * Painting *restricting* red was its own small lie, on three screens: a board
 * restricting something is the board working, not a fault. So was painting
 * *2 still open* red because one of the two was late.
 *
 * ── and why this reads the source ─────────────────────────────────────────
 *
 * jsdom applies no stylesheet, so a rendered test cannot see a colour; and
 * rendering all nine lists would need nine sets of fixtures to assert one
 * thing about all of them. This reads what the files say, the way the act
 * scanner next door does — and it asserts first that it found the marks it
 * claims to be reading, because a scanner that matched nothing would pass.
 */

const SRC = resolve(process.cwd(), 'src');

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });

/** Every `<Mark …>` opening tag, with where it starts. */
function marks(source: string): { tag: string; at: number }[] {
  const out: { tag: string; at: number }[] = [];
  for (const m of source.matchAll(/<Mark\b/g)) {
    let depth = 0;
    let i = m.index! + m[0].length;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    out.push({ tag: source.slice(m.index!, i + 1), at: m.index! });
  }
  return out;
}

const lineOf = (source: string, at: number) => source.slice(0, at).split('\n').length;

/**
 * The accents that are not the exception.
 *
 * `text-breach` is allowed and `text-lapis` is not: a mark is a state, and a
 * state is not something you press.
 */
const FORBIDDEN = ['text-settled', 'text-goldink', 'text-lapis', 'text-gold'];

function painted(): string[] {
  const found: string[] = [];
  for (const p of files(SRC)) {
    const source = readFileSync(p, 'utf8');
    for (const { tag, at } of marks(source)) {
      for (const colour of FORBIDDEN) {
        if (tag.includes(colour)) {
          found.push(`${relative(SRC, p)}:${lineOf(source, at)} ${colour}`);
        }
      }
    }
  }
  return found;
}

describe('a list shows one accent, and it is the exception', () => {
  it('finds the marks it claims to read', () => {
    let count = 0;
    for (const p of files(SRC)) count += marks(readFileSync(p, 'utf8')).length;
    /*
     * Nine lists draw one, several draw two. Well under this and the scanner
     * has stopped seeing them — which is how a measure like this passes while
     * the thing it watches drifts.
     */
    expect(count).toBeGreaterThan(10);
  });

  it('still sees a tone where one is given', () => {
    /*
     * The half that makes the next one mean anything: if the scanner could
     * not read a `tone` at all, an empty result would prove nothing. Red is
     * the one that stays, so there is one to find.
     */
    let withBreach = 0;
    for (const p of files(SRC)) {
      for (const { tag } of marks(readFileSync(p, 'utf8'))) {
        if (tag.includes('text-breach')) withBreach += 1;
      }
    }
    expect(withBreach).toBeGreaterThan(0);
  });

  it('paints no mark green, gold or lapis', () => {
    expect(painted()).toEqual([]);
  });
});
