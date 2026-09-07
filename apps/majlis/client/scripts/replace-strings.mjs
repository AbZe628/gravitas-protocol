import fs from 'node:fs';

/*
 * Replace strings that already exist, in one language.
 *
 *   node scripts/replace-strings.mjs en batch.json   # from apps/majlis/client
 *
 * `merge-strings.mjs` is insert-only and will not touch a key a language
 * already holds, which is right for translation and useless for rewriting. This
 * is the other half: it changes only keys that are already there, and refuses a
 * key it cannot find rather than adding it quietly — a typo that silently
 * created a new key would leave the old wording on screen with no sign of it.
 *
 * It rewrites one language at a time on purpose. Changing the English of a
 * string whose Arabic and Urdu were translated from the older wording leaves
 * the three out of step, and doing them in separate passes makes that visible
 * instead of hiding it behind one command.
 */

const [lang, file] = process.argv.slice(2);
if (!lang || !file) {
  console.error('usage: replace-strings.mjs <en|ar|ur> <batch.json>');
  process.exit(1);
}

const batch = JSON.parse(fs.readFileSync(file, 'utf8'));
const p = 'src/locales/index.ts';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const head = (l) => lines.findIndex((x) => x.startsWith('const ' + l + ': Dict = {'));
const at = { en: head('en'), ar: head('ar'), ur: head('ur') };
const dictsAt = lines.findIndex((x) => x.startsWith('const DICTS'));
if (Object.values(at).some((i) => i < 0) || dictsAt < 0) {
  console.error('cannot find the dictionaries');
  process.exit(1);
}

const order = ['en', 'ar', 'ur'].sort((a, b) => at[a] - at[b]);
const ends = { [order[0]]: at[order[1]], [order[1]]: at[order[2]], [order[2]]: dictsAt };

const from = at[lang];
const to = ends[lang];

let changed = 0;
const missing = [];

for (const [key, value] of Object.entries(batch)) {
  let found = false;
  for (let i = from + 1; i < to; i++) {
    const m = /^\s{2}["']?([A-Za-z0-9_.\-]+)["']?\s*:/.exec(lines[i]);
    if (!m || m[1] !== key) continue;

    /*
     * A value may run over several lines. Everything from this key to the line
     * before the next key is replaced, so a long string is not left with an
     * orphaned tail.
     */
    let end = i;
    while (end + 1 < to && !/^\s{2}["']?[A-Za-z0-9_.\-]+["']?\s*:/.test(lines[end + 1])) end++;

    lines.splice(i, end - i + 1, '  ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',');
    changed++;
    found = true;
    break;
  }
  if (!found) missing.push(key);
}

if (missing.length) {
  console.error('not found in ' + lang + ', nothing written: ' + missing.join(', '));
  process.exit(1);
}

fs.writeFileSync(p, lines.join('\n'));
console.log(lang + ': ' + changed + ' rewritten');
