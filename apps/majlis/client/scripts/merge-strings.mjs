import fs from 'node:fs';

/*
 * Add strings to `src/locales/index.ts` without ever overwriting one.
 *
 *   node scripts/merge-strings.mjs batch.json      # run from apps/majlis/client
 *
 * A batch is `{ "key": { "en": "…", "ar": "…", "ur": "…" } }`. A language that
 * already holds a key is left alone and the skip is reported, so a translator's
 * work can never be clobbered and re-running the same batch is a no-op.
 *
 * **Why this exists rather than hand-editing.** The dictionaries are three
 * object literals in one 3,000-line file, and two different edits have silently
 * destroyed half a language: a duplicate key overrides without a warning, and a
 * `...en` spread dropped mid-literal overwrites every key above it. Both leave
 * the file looking complete. Inserting one line directly under the opening
 * brace cannot do either.
 *
 * Afterwards, `src/Locales.test.ts` measures coverage from the built objects —
 * never by counting lines in the file, which was once wrong by 400 keys.
 */

const batch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const p = 'src/locales/index.ts';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const head = (lang) => lines.findIndex((l) => l.startsWith('const ' + lang + ': Dict = {'));
const at = { en: head('en'), ar: head('ar'), ur: head('ur') };
const dictsAt = lines.findIndex((l) => l.startsWith('const DICTS'));
if (Object.values(at).some((i) => i < 0) || dictsAt < 0) {
  console.error('cannot find the dictionaries');
  process.exit(1);
}

// In file order, so each dictionary's end is the next one's start.
const order = ['en', 'ar', 'ur'].sort((a, b) => at[a] - at[b]);
const ends = { [order[0]]: at[order[1]], [order[1]]: at[order[2]], [order[2]]: dictsAt };

function keysIn(from, to) {
  const held = new Set();
  for (let i = from; i < to; i++) {
    const m = /^\s{2}["']?([A-Za-z0-9_.\-]+)["']?\s*:/.exec(lines[i]);
    if (m) held.add(m[1]);
  }
  return held;
}

const has = Object.fromEntries(order.map((l) => [l, keysIn(at[l], ends[l])]));
const rows = Object.fromEntries(order.map((l) => [l, []]));
const added = Object.fromEntries(order.map((l) => [l, 0]));
const skipped = Object.fromEntries(order.map((l) => [l, 0]));

for (const [key, forms] of Object.entries(batch)) {
  for (const lang of order) {
    const value = forms[lang];
    if (!value) continue;
    if (has[lang].has(key)) {
      skipped[lang]++;
      continue;
    }
    rows[lang].push('  ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',');
    added[lang]++;
  }
}

// Bottom-up, so the earlier indexes stay valid.
for (const lang of [...order].reverse()) lines.splice(at[lang] + 1, 0, ...rows[lang]);

fs.writeFileSync(p, lines.join('\n'));
console.log(
  order
    .map((l) => l + ' +' + added[l] + (skipped[l] ? ' (' + skipped[l] + ' held)' : ''))
    .join('   '),
);
