import fs from 'node:fs';

/*
 * Take strings out of `src/locales/index.ts`, in all three languages at once.
 *
 *   node scripts/remove-strings.mjs dead.txt      # run from apps/majlis/client
 *
 * The file is one key per line, blank lines and `#` comments ignored.
 *
 * ── why a script and not an editor ────────────────────────────────────────
 *
 * The same reason `merge-strings.mjs` exists. The dictionaries are three
 * object literals in one 3,800-line file and a hand edit has twice destroyed
 * half a language without the file looking any different. Removing by exact
 * key match, one line at a time, in each of the three blocks, cannot take a
 * neighbouring line with it.
 *
 * ── it refuses to remove a key the code still asks for ────────────────────
 *
 * A key removed while a screen still names it does not fail the build: it
 * renders as the raw key, `more.title`, in front of whoever opened that
 * screen. So every key is checked against the whole of `src/` first, and a
 * single hit anywhere — `t('x')`, a ternary, a prefix a template literal
 * builds — cancels the whole run rather than that one key. Half a removal is
 * worse than none.
 */

const listed = fs
  .readFileSync(process.argv[2], 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

if (listed.length === 0) {
  console.error('nothing listed');
  process.exit(1);
}

/* ── is any of them still on a screen? ─────────────────────────────────── */

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = dir + '/' + name;
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name) && !p.includes('locales')) out.push(p);
  }
  return out;
}

const sources = walk('src').map((p) => [p, fs.readFileSync(p, 'utf8')]);

/*
 * Both checks start at an opening quote.
 *
 * Without that, `reconsider.title` matches inside `reconsider.titlePrefix` and
 * `tab.` matches inside `calc.tab.${kind}`, and the run refuses over keys
 * nothing uses. A guard that cries wolf is one somebody eventually disables.
 */
const quoted = (s) => new RegExp('[\'"`]' + s.replace(/[.$]/g, (c) => '\\' + c));
const stillUsed = [];
for (const key of listed) {
  const exact = quoted(key + '[\'"`]');
  for (const [p, src] of sources) {
    if (exact.test(src)) stillUsed.push(key + '  in  ' + p);
  }
  // A key a template literal builds: `attention.${kind}` covers attention.x.
  const parts = key.split('.');
  for (let i = 1; i < parts.length; i++) {
    const prefix = parts.slice(0, i).join('.') + '.';
    const built = quoted(prefix + '\\$\\{');
    for (const [p, src] of sources) {
      if (built.test(src)) stillUsed.push(key + '  built by  ' + prefix + '${…}  in  ' + p);
    }
  }
}

if (stillUsed.length > 0) {
  console.error('these are still asked for, so nothing was removed:');
  for (const line of stillUsed) console.error('  ' + line);
  process.exit(1);
}

/* ── remove ────────────────────────────────────────────────────────────── */

const p = 'src/locales/index.ts';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const head = (lang) => lines.findIndex((l) => l.startsWith('const ' + lang + ': Dict = {'));
const at = { en: head('en'), ar: head('ar'), ur: head('ur') };
const dictsAt = lines.findIndex((l) => l.startsWith('const DICTS'));
if (Object.values(at).some((i) => i < 0) || dictsAt < 0) {
  console.error('cannot find the dictionaries');
  process.exit(1);
}

const order = ['en', 'ar', 'ur'].sort((a, b) => at[a] - at[b]);
const ends = { [order[0]]: at[order[1]], [order[1]]: at[order[2]], [order[2]]: dictsAt };

const wanted = new Set(listed);
const removed = Object.fromEntries(order.map((l) => [l, 0]));
const keep = [];

for (let i = 0; i < lines.length; i++) {
  const lang = order.find((l) => i > at[l] && i < ends[l]);
  if (lang) {
    const m = /^\s{2}["']?([A-Za-z0-9_.\-]+)["']?\s*:/.exec(lines[i]);
    if (m && wanted.has(m[1])) {
      removed[lang]++;
      continue;
    }
  }
  keep.push(lines[i]);
}

fs.writeFileSync(p, keep.join('\n'));

const notFound = listed.filter(
  (k) => !lines.some((l) => new RegExp('^\\s{2}["\']?' + k.replace(/\./g, '\\.') + '["\']?\\s*:').test(l)),
);
console.log(order.map((l) => l + ' -' + removed[l]).join('   '));
if (notFound.length) console.log('not in the dictionary: ' + notFound.join(' '));
