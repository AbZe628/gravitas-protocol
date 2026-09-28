import fs from 'node:fs';

/*
 * The three dictionaries, one file each, for the scripts that edit them.
 *
 * They were three object literals in one module, and every script found its
 * way around that module by looking for where one language began and the
 * next one did. Each language is now its own file — so that a reader is sent
 * only their own (see `loadLang` in src/locales/index.ts) — and each file
 * holds exactly one block, from `const <lang>: Dict = {` to the first `};`.
 */

export const LANGS = ['en', 'ar', 'ur'];

/** A line that opens a key, whichever quote it was written with. */
export const KEY_LINE = /^\s{2}["']?([A-Za-z0-9_.\-]+)["']?\s*:/;

export function open(lang) {
  const path = `src/locales/${lang}.ts`;
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
  const from = lines.findIndex((l) => l.startsWith(`const ${lang}: Dict = {`));
  const to = lines.findIndex((l, i) => i > from && l === '};');
  if (from < 0 || to < 0) {
    console.error(`cannot find the ${lang} dictionary in ${path}`);
    process.exit(1);
  }
  return {
    lang,
    path,
    lines,
    /** The line that opens the block. */
    from,
    /** The line that closes it. */
    to,
    keys() {
      const held = new Set();
      for (let i = from + 1; i < to; i++) {
        const m = KEY_LINE.exec(lines[i]);
        if (m) held.add(m[1]);
      }
      return held;
    },
    save() {
      fs.writeFileSync(path, lines.join('\n'));
    },
  };
}
