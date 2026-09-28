import fs from 'node:fs';
import { LANGS, open } from './dictionaries.mjs';

/*
 * Add strings to the dictionaries (`src/locales/{en,ar,ur}.ts`) without ever
 * overwriting one.
 *
 *   node scripts/merge-strings.mjs batch.json      # run from apps/majlis/client
 *
 * A batch is `{ "key": { "en": "…", "ar": "…", "ur": "…" } }`. A language that
 * already holds a key is left alone and the skip is reported, so a translator's
 * work can never be clobbered and re-running the same batch is a no-op.
 *
 * **Why this exists rather than hand-editing.** The dictionaries are three
 * object literals of 2,500 lines each, and two different edits have silently
 * destroyed half a language: a duplicate key overrides without a warning, and a
 * `...en` spread dropped mid-literal overwrites every key above it. Both leave
 * the file looking complete. Inserting one line directly under the opening
 * brace cannot do either.
 *
 * Afterwards, `src/Locales.test.ts` measures coverage from the built objects —
 * never by counting lines in the file, which was once wrong by 400 keys.
 */

const batch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const added = Object.fromEntries(LANGS.map((l) => [l, 0]));
const skipped = Object.fromEntries(LANGS.map((l) => [l, 0]));

for (const lang of LANGS) {
  const dict = open(lang);
  const has = dict.keys();
  const rows = [];
  for (const [key, forms] of Object.entries(batch)) {
    const value = forms[lang];
    if (!value) continue;
    if (has.has(key)) {
      skipped[lang]++;
      continue;
    }
    rows.push('  ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',');
    added[lang]++;
  }
  dict.lines.splice(dict.from + 1, 0, ...rows);
  dict.save();
}

console.log(
  LANGS.map((l) => l + ' +' + added[l] + (skipped[l] ? ' (' + skipped[l] + ' held)' : '')).join('   '),
);
