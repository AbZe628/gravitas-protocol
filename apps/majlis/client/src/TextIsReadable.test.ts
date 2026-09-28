import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { coloursInConfig } from '../scripts/tokens.mjs';

/**
 * Every colour text is set in reads at 4.5 to 1 on every ground it sits on.
 *
 * ── what this holds shut ──────────────────────────────────────────────────
 *
 * `muted` was #9C9284: 3.1 to 1 on white and 2.7 on the vellum, on 761
 * places — the second line of every list, every date, every caption. Gold set
 * as text was 3.0 on the vellum, on 29 places, `faint` was 2.1 on 14, and
 * WCAG 2.2 asks 4.5 of all of it. A scholar reading at arm's length on a
 * phone in daylight got the context of every row in a grey that was not
 * written to be read.
 *
 * Two halves, both needed:
 *
 * - the palette: every colour meant for text, on every ground it may sit on,
 *   is measured here — change a hex and this says what it now reads at;
 * - the markup: every `text-` colour the screens actually use is one of those.
 *   A colour that is fine as a mark and wrong as a word (gold, faint) cannot
 *   come back as text one class at a time.
 */

type Hex = string;
/* Read the way `TokensAgree` reads it, so both guards measure the same file. */
const colours: Record<string, Hex> = Object.fromEntries(coloursInConfig());

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex: Hex): [number, number, number] => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};
const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** A colour at an opacity, as it lands on the ground under it. */
const over = (ink: [number, number, number], alpha: number, ground: [number, number, number]) =>
  ink.map((v, i) => Math.round(v * alpha + ground[i] * (1 - alpha))) as [number, number, number];

/** The light grounds text sits on: the page, the surfaces, the four tints. */
const LIGHT = ['ink', 'surface', 'raised', 'settledtint', 'goldtint', 'breachtint', 'lapistint'];
/** The colours words are set in on them. */
const ON_LIGHT = ['paper', 'sand', 'muted', 'lapis', 'settled', 'breach', 'goldink', 'breachink'];
/** The solid grounds that carry white words: the acts, the states, the dark bar. */
const DARK = ['lapis', 'lapissoft', 'settled', 'breach', 'paper'];
/** White, at every strength the markup sets it. */
const WHITE: Record<string, number> = { white: 1, raised: 1, 'white/90': 0.9, 'white/80': 0.8 };
/**
 * A hex written into the markup, with the one ground it is written for. Each
 * one is measured on that ground like every other.
 */
const WRITTEN: Record<string, { on: Hex }> = {
  '#235A49': { on: colours.settledtint },
  '#F2DFB5': { on: '#133A5F' },
};

const NOT_A_COLOUR = new Set([
  'label', 'note', 'ui', 'body', 'lead', 'sub', 'title', 'head', 'display', 'hero',
  'start', 'end', 'center', 'left', 'right', 'justify', 'sm', 'xs', 'base', 'lg',
]);

describe('the palette reads as text', () => {
  it('reads at 4.5 to 1 wherever a word may sit on a light ground', () => {
    const under: string[] = [];
    for (const ink of ON_LIGHT) {
      for (const ground of LIGHT) {
        const r = contrast(rgb(colours[ink]), rgb(colours[ground]));
        if (r < 4.5) under.push(`${ink} on ${ground}: ${r.toFixed(2)}`);
      }
    }
    expect(under).toEqual([]);
  });

  it('reads at 4.5 to 1 in white on every solid ground', () => {
    const under: string[] = [];
    for (const [name, alpha] of Object.entries(WHITE)) {
      for (const ground of DARK) {
        const g = rgb(colours[ground]);
        const r = contrast(over([255, 255, 255], alpha, g), g);
        if (r < 4.5) under.push(`${name} on ${ground}: ${r.toFixed(2)}`);
      }
    }
    expect(under).toEqual([]);
  });

  it('reads at 4.5 to 1 where a hex is written for one ground', () => {
    const under = Object.entries(WRITTEN)
      .map(([hex, { on }]) => [hex, contrast(rgb(hex), rgb(on))] as const)
      .filter(([, r]) => r < 4.5)
      .map(([hex, r]) => `${hex}: ${r.toFixed(2)}`);
    expect(under).toEqual([]);
  });
});

describe('the screens set words only in those colours', () => {
  const SRC = resolve(process.cwd(), 'src');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) return files(p);
      return /\.tsx$/.test(n) && !/\.test\./.test(n) ? [p] : [];
    });
  const used = new Map<string, string>();
  for (const p of files(SRC)) {
    const text = readFileSync(p, 'utf8');
    for (const m of text.matchAll(/(?<![\w-])(?:[a-z-]+:)*text-(\[#[0-9A-Fa-f]{6}\]|[a-z]+(?:\/\d+)?)(?![\w-])/g)) {
      const name = m[1];
      if (!used.has(name)) used.set(name, relative(SRC, p));
    }
  }

  it('found the markup it claims to read', () => {
    expect(used.has('muted') && used.has('paper') && used.has('lapis')).toBe(true);
  });

  /*
   * A measured colour faded after the fact is not the colour that was
   * measured. The counts beside the queue's filters were the sand at 60%, and
   * a dozen identifiers were `text-muted opacity-70` — 3.1 to 1, the old
   * grey by another route. Separators (`·`, `/`) and superseded records are
   * the deliberate exceptions: marks, and history drawn as history.
   */
  it('fades no word below what was measured', () => {
    const faded: string[] = [];
    for (const p of files(SRC)) {
      readFileSync(p, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (!/\bopacity-[1-7]0\b/.test(line)) return;
          if (!/text-(muted|sand|paper|label|note|ui|body)\b|tabular-nums/.test(line)) return;
          if (/supersededAt|withdrawnAt|disabled|aria-hidden|animate-spin/.test(line)) return;
          faded.push(`${relative(SRC, p)}:${i + 1}`);
        });
    }
    expect(faded).toEqual([]);
  });

  it('uses no colour for words that has not been measured above', () => {
    const allowed = new Set([...ON_LIGHT, ...Object.keys(WHITE)]);
    const stray = [...used.entries()]
      .filter(([name]) => !NOT_A_COLOUR.has(name))
      .filter(([name]) => {
        const written = name.match(/^\[(#[0-9A-Fa-f]{6})\]$/);
        return written ? !(written[1].toUpperCase() in WRITTEN) : !allowed.has(name);
      })
      .map(([name, where]) => `text-${name} (${where})`);
    expect(stray).toEqual([]);
  });
});
