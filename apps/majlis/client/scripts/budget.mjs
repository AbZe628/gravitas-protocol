import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

/*
 * The first download has a budget, and the build fails past it.
 *
 *   node scripts/budget.mjs            # after `vite build`, from apps/majlis/client
 *
 * ── why ───────────────────────────────────────────────────────────────────
 *
 * The first download was every screen and all three dictionaries in one
 * piece: 1,236 kB, 327 kB compressed. Vite said so on every build, in yellow,
 * and nobody acted on it because a warning fails nothing. A scholar opening a
 * link on a phone waited for the whole application to draw one question.
 *
 * Splitting it (see src/screens.ts and loadLang in src/locales/index.ts)
 * brought it to about 148 kB. What keeps it there is this: one static import
 * of a screen in the wrong place, or of all three dictionaries, and the build
 * stops and says what it weighs.
 *
 * ── what it measures ──────────────────────────────────────────────────────
 *
 * What `index.html` makes the browser fetch before anything can be drawn: the
 * entry script, every script it preloads, and the stylesheets. Gzipped here,
 * the way a server sends them. Screens fetched later, the other languages and
 * the PDF reader are not counted — they are the point of the split.
 *
 * The figure is a budget, not a target. Raising it is allowed; doing so is a
 * decision somebody makes and writes down here, not something that happens.
 */

const BUDGET_KB = 165;

const dist = path.resolve(process.argv[2] ?? 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

const refs = [
  ...[...html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]),
].filter((r) => r.startsWith('/'));

if (refs.length === 0) {
  console.error('budget: index.html names no script — nothing was measured, which proves nothing');
  process.exit(1);
}

let total = 0;
const rows = [];
for (const ref of [...new Set(refs)]) {
  const bytes = gzipSync(fs.readFileSync(path.join(dist, ref)), { level: 9 }).length;
  total += bytes;
  rows.push(`  ${(bytes / 1024).toFixed(1).padStart(7)} kB  ${ref}`);
}

const kb = total / 1024;
console.log(`first download, gzipped: ${kb.toFixed(1)} kB of ${BUDGET_KB} kB\n${rows.join('\n')}`);
if (kb > BUDGET_KB) {
  console.error(
    `\nbudget: the first download is ${kb.toFixed(1)} kB, over the ${BUDGET_KB} kB budget.\n` +
      'Something that used to arrive later now arrives first — usually a static import of a\n' +
      'screen (they belong in src/screens.ts), or of src/locales/all.ts outside a test.',
  );
  process.exit(1);
}
