/**
 * The palette is written once, in tokens.css, and this checks nothing drifted.
 *
 * ── the hazard this closes ────────────────────────────────────────────────
 *
 * Two files held the same colours and were kept in step by hand.
 * `tailwind.config.js` said so at the top and warned that it had *already
 * caused one drift*. A colour that disagrees between the two is invisible
 * while you are writing it and permanent once it ships: the utility says one
 * thing, the variable says another, and which one a given element gets depends
 * on whether whoever wrote it reached for a class or a `var()`.
 *
 * ── why a check and not a generator ───────────────────────────────────────
 *
 * Generating the config would mean a build step between editing a colour and
 * seeing it, and a generated file somebody will eventually edit by hand
 * anyway. The duplication is not the problem — the *silence* is. So both files
 * stay readable and hand-written, and this refuses to let them disagree.
 *
 * Run by `npm run tokens`, and by the test suite, so a drift fails there
 * rather than in a screenshot three weeks later.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CSS = join(here, '..', 'src', 'design', 'tokens.css');
const CONFIG = join(here, '..', 'tailwind.config.js');

/** `--g-lapis: #164470;` → { lapis: '#164470' } */
export function coloursInCss(text = readFileSync(CSS, 'utf8')) {
  const found = new Map();
  for (const [, name, value] of text.matchAll(/--g-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) {
    found.set(name.replace(/-/g, ''), value.toUpperCase());
  }
  return found;
}

/** `lapis: '#164470',` → { lapis: '#164470' } */
export function coloursInConfig(text = readFileSync(CONFIG, 'utf8')) {
  const block = text.slice(text.indexOf('colors: {'), text.indexOf('fontFamily:'));
  const found = new Map();
  for (const [, name, value] of block.matchAll(/([a-z][a-z0-9]*):\s*'(#[0-9A-Fa-f]{6})'/g)) {
    found.set(name, value.toUpperCase());
  }
  return found;
}

/**
 * Names that exist on one side only, on purpose.
 *
 * `attention` and `warn` are aliases the markup still uses; `surfaceraised`
 * and the washes are derived values that never became utilities. Each is
 * listed rather than skipped by a pattern, so adding one is a decision.
 */
const ALLOWED_TO_BE_ALONE = new Set([
  'attention', 'warn',
  'surfaceraised', 'paperdim', 'goldwash', 'lapiswash', 'ring',
]);

/**
 * Where the two files call one colour by two names.
 *
 * Listed one at a time rather than matched by a pattern, so adding one is a
 * decision somebody made rather than something a rule quietly swallowed.
 */
const SAME_THING = new Map([
  /* The white sheet. `deep` is what the palette called it first. */
  ['raised', 'deep'],
  /* The edge. `--g-line` is the same colour with alpha; this is the solid. */
  ['line', 'lineflat'],
]);

export function drift() {
  const css = coloursInCss();
  const config = coloursInConfig();
  const wrong = [];

  for (const [name, value] of config) {
    if (ALLOWED_TO_BE_ALONE.has(name)) continue;
    const mine = css.get(SAME_THING.get(name) ?? name);
    if (!mine) {
      wrong.push(`${name} is in tailwind.config.js and not in tokens.css`);
    } else if (mine !== value) {
      wrong.push(`${name} is ${value} in tailwind.config.js and ${mine} in tokens.css`);
    }
  }

  return wrong;
}

/* Run directly: say what is wrong, and fail loudly if anything is. */
if (process.argv[1] && process.argv[1].endsWith('tokens.mjs')) {
  const wrong = drift();
  if (wrong.length === 0) {
    const n = coloursInConfig().size;
    console.log(`tokens.css i tailwind.config.js se slazu — ${n} boja provjereno`);
  } else {
    console.error('boje se razilaze:\n  ' + wrong.join('\n  '));
    process.exit(1);
  }
}
