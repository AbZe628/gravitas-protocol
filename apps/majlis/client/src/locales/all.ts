import type { Dict } from './dict.js';
import en from './en.js';
import ar from './ar.js';
import ur from './ur.js';
import { holdLang, type Lang } from './index.js';

/**
 * Every language at once, for the tests and nothing else.
 *
 * The application fetches Arabic and Urdu only when somebody chooses them (see
 * `loadLang`). A test cannot wait on a chunk, and the coverage tests measure
 * all three built objects side by side, so this holds all three from the start.
 * `test-setup.ts` imports it, which is why a test can render in Arabic in the
 * same tick it asks for it.
 *
 * Nothing in `src/` outside a test may import this: it would put all three
 * dictionaries back into the first download, which is what the bundle budget
 * in `scripts/budget.mjs` exists to catch.
 */
holdLang('ar', ar);
holdLang('ur', ur);

/**
 * The dictionaries themselves, so a test can measure coverage rather than
 * count lines. Two of the three ways a language quietly lost half its strings
 * were invisible to every test that only read the source: a duplicate key
 * overrides silently, and a spread of `en` mid-literal overwrites whatever
 * came before it. Reading the built objects catches both.
 */
export const DICTIONARIES: Record<Lang, Dict> = { en, ar, ur };
