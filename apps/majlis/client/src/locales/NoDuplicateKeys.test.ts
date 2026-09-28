import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * No key is written twice in one language.
 *
 * ── why this cannot be tested through the module ──────────────────────────
 *
 * A duplicate key in an object literal is not an error in JavaScript. The
 * second wins, silently, and by the time anything imports the dictionary the
 * first is simply gone — so a test that read `DICTIONARIES` would be reading
 * the damage rather than finding it. This reads the source.
 *
 * ── why it matters more here than in most places ──────────────────────────
 *
 * The dictionary is seven thousand lines and three languages, and it grows a
 * block at a time as work lands. A key added twice does not fail anything: not
 * `tsc`, which sees a valid object; not the key-coverage guard on the server,
 * which only asks whether a key has *words* behind it. The screen simply says
 * the wrong sentence.
 *
 * And it can strike in one language only. A duplicate written into the Arabic
 * block alone leaves English and Urdu correct, which means the person most
 * likely to notice — whoever is reading the screen in Arabic — is the person
 * least likely to be in the room.
 *
 * The case that prompted this: a breach ends with **close the file**, and a
 * vote ends with **close the vote**. Two different acts by two different
 * people. They were one key away from silently becoming one sentence.
 */

/*
 * From the project root rather than from `import.meta.url`: these tests run in
 * a jsdom environment where the module URL is not a file URL, and resolving it
 * throws before a single assertion has run.
 *
 * One file per language, since a reader is sent only their own (see
 * `loadLang` in ./index.ts). Each file holds one block.
 */
const LANGS = ['en', 'ar', 'ur'] as const;

/** Where the language's block starts and ends in its own file, found rather than assumed. */
function block(lang: string): { lang: string; lines: string[]; from: number; to: number } {
  const lines = readFileSync(resolve(process.cwd(), `src/locales/${lang}.ts`), 'utf8').split('\n');
  const from = lines.findIndex((line) => new RegExp(`^const ${lang}: Dict = \\{`).test(line));
  const to = lines.findIndex((line, i) => i > from && line === '};');
  return { lang, lines, from, to };
}

const starts = LANGS.map(block);

describe('the dictionary says each thing once', () => {
  /*
   * The walk found the blocks it claims to check.
   *
   * Without this the whole file passes by never having read anything — which
   * is how a guard in this repository once watched two routes out of
   * seventy-four and reported itself green.
   */
  it('found all three languages', () => {
    expect(starts.filter((b) => b.from >= 0 && b.to > b.from).map((b) => b.lang)).toEqual(['en', 'ar', 'ur']);
  });

  for (const block of starts) {
    const { lines, to: end } = block;

    it(`has no key twice in ${block.lang}`, () => {
      const seen = new Map<string, number>();
      const twice: string[] = [];

      for (let i = block.from + 1; i < end; i++) {
        const m = lines[i].match(/^ {2}["']([A-Za-z0-9_.-]+)["']:/);
        if (!m) continue;
        const key = m[1];
        if (seen.has(key)) twice.push(`${key} (lines ${seen.get(key)} and ${i + 1})`);
        else seen.set(key, i + 1);
      }

      expect(twice).toEqual([]);
    });

    it(`read a dictionary's worth of keys in ${block.lang}`, () => {
      let keys = 0;
      for (let i = block.from + 1; i < end; i++) {
        if (/^ {2}["'][A-Za-z0-9_.-]+["']:/.test(lines[i])) keys++;
      }
      // Well under the real figure, so it catches a broken walk rather than
      // failing every time a block grows or shrinks.
      expect(keys).toBeGreaterThan(1000);
    });
  }
});
