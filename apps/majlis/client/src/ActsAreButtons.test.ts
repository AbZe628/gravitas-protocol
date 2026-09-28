import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * No act is drawn as underlined type.
 *
 * ── what this holds shut ──────────────────────────────────────────────────
 *
 * Underlined words are how a page marks a link: pressing them goes somewhere.
 * Here they were also *take this on*, *give it to somebody else*, *do not take
 * it up*, *withdraw this* — controls that change the record, drawn exactly
 * like the ones that only move the member to another screen. A member could
 * not tell from looking which of the two a line of blue type would do, and
 * that is the difference between a page with buttons and an application.
 *
 * An act is a `Button`: its words in the accent colour with no box (`plain`),
 * or a filled one where it is the act. A way to somewhere may still be a link
 * and may still be underlined; this reads only controls that do something.
 *
 * Read from the source, the way the name scanner reads it: every opening tag
 * of a `Button` or a `button`, with its class written in the tag or held in a
 * constant of the same file.
 */

const SRC = resolve(process.cwd(), 'src');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });

/** Every `<Button …>` and `<button …>` opening tag, with where it starts. */
function openingTags(source: string): { tag: string; at: number }[] {
  const out: { tag: string; at: number }[] = [];
  for (const m of source.matchAll(/<(?:Button|button)\b/g)) {
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

function underlinedActs(): string[] {
  const found: string[] = [];
  for (const p of files(SRC)) {
    const source = readFileSync(p, 'utf8');
    for (const { tag, at } of openingTags(source)) {
      let classes = tag;
      /* A class held in a constant: `className={shape}` */
      const held = tag.match(/className=\{\s*([A-Za-z_$][\w$]*)\s*\}/);
      if (held) {
        /* The nearest one above the tag: a file can hold several of the same name, one per component. */
        const defs = [
          ...source.slice(0, at).matchAll(new RegExp(`const\\s+${held[1]}\\s*=\\s*([\\s\\S]*?);\\n`, 'g')),
        ];
        const def = defs[defs.length - 1];
        if (def) classes += ' ' + def[1];
      }
      if (/(?<![\w:-])underline(?![\w-])/.test(classes)) {
        found.push(`${relative(SRC, p)}:${lineOf(source, at)}`);
      }
    }
  }
  return found;
}

describe('acts are buttons, not underlined words', () => {
  it('finds the controls it claims to read', () => {
    let tags = 0;
    for (const p of files(SRC)) tags += openingTags(readFileSync(p, 'utf8')).length;
    expect(tags).toBeGreaterThan(150);
  });

  it('draws no act as underlined type', () => {
    expect(underlinedActs()).toEqual([]);
  });
});
