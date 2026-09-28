/**
 * Three languages at launch. Most of the scholars this is built for do their
 * serious work in Arabic; an English-only instrument would be an
 * English-speaking instrument.
 *
 * The Arabic and Urdu in `ar.ts` and `ur.ts` are a working baseline and must
 * be reviewed by a native speaker with knowledge of the subject before any
 * board uses this. Terminology in Islamic finance is precise and a plausible
 * translation is not the same as a correct one.
 */

import type { Dict } from './dict.js';
import en from './en.js';

export type { Dict } from './dict.js';

export type Lang = 'en' | 'ar' | 'ur';

export const LANGS: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
];

export function dirFor(lang: Lang): 'ltr' | 'rtl' {
  return LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';
}

/**
 * The languages this page holds, and how to fetch the others.
 *
 * ── why only English arrives with the application ────────────────────────
 *
 * The three dictionaries were one module, so every reader was sent all three
 * before the first screen was drawn: 52 kB of English, 57 kB of Arabic and
 * 59 kB of Urdu, compressed, of which anybody reads one. For the English
 * reader that was two-thirds of the words wasted; for the Arabic reader the
 * Urdu, every time.
 *
 * English stays with the application because it is the fallback — a key the
 * other two do not have yet is said in English (see `translate`), so it must
 * be here before anything is drawn. Arabic and Urdu are fetched when they are
 * chosen, and `main.tsx` fetches the reader's own before the first screen, so
 * an Arabic reader never sees the English flash past first.
 */
const DICTS: Partial<Record<Lang, Dict>> = { en };

const FETCH: Record<Exclude<Lang, 'en'>, () => Promise<{ default: Dict }>> = {
  ar: () => import('./ar.js'),
  ur: () => import('./ur.js'),
};

/** Whether this language's sentences are already on the page. */
export function isLoaded(lang: Lang): boolean {
  return DICTS[lang] !== undefined;
}

/**
 * Fetch a language's sentences, once. Resolves at once for one already held.
 *
 * A failure is left to the caller: the screen stays in the language it was in,
 * which is true, rather than switching to a language it cannot say.
 */
export async function loadLang(lang: Lang): Promise<void> {
  if (isLoaded(lang) || lang === 'en') return;
  DICTS[lang] = (await FETCH[lang]()).default;
}

/**
 * Put a language's sentences on the page without fetching them.
 *
 * For `all.ts`, which the tests use: a test renders in Arabic in the same tick
 * it asks for it, and has no network to fetch a chunk over.
 */
export function holdLang(lang: Lang, dict: Dict): void {
  DICTS[lang] = dict;
}

/**
 * First Strong Isolate and Pop Directional Isolate.
 *
 * `FSI` opens a run whose direction the browser takes from its first strong
 * character, and `PDI` closes it. Both are invisible and both are ordinary
 * characters, so a wrapped value is still a `string` and still works where a
 * translation goes into an `aria-label` or a `title`.
 */
/*
 * Built from their code points rather than written out.
 *
 * These two are invisible bidi controls, and invisible bidi controls in source
 * are what the Trojan Source attack is made of \u2014 so toolchains along the way
 * are entitled to strip them, and something in this one does. Written as a
 * literal they silently became the empty string, the wrap compiled to
 * `'' + text + ''`, and every test passed while nothing happened. Constructed
 * at runtime there is nothing in the file for anything to sanitise.
 */
const FSI = String.fromCharCode(0x2068);
const PDI = String.fromCharCode(0x2069);

/**
 * A translation, and English where there is not one yet.
 *
 * ── why the fallback is isolated ──────────────────────────────────────────
 *
 * Arabic is 190 keys short and Urdu 201, so a right-to-left screen is mostly
 * English sentences today. Dropped into an RTL paragraph raw, the bidi
 * algorithm attaches their trailing punctuation to the surrounding direction
 * and a full stop appears at the *start* of the line: `.have never been put to
 * this board`. Nothing is wrong with the layout or the string — but the screen
 * reads as broken, and a board looking at the Arabic build would reasonably
 * conclude the software is.
 *
 * Wrapping the fallback in an isolate makes the browser lay that run out on
 * its own terms, so an untranslated sentence reads as an untranslated
 * sentence rather than as a defect. It does not translate anything and it is
 * not meant to: see docs/STATE.md on who writes the Arabic and Urdu.
 */
/**
 * What goes into the gaps in a sentence.
 *
 * The work grammar says things like *three of six conditions are unanswered*,
 * and the three and the six are facts the server counted. A sentence that
 * carried its figures already joined to it could not be translated at all,
 * so the sentence is a key and the figures are these.
 */
export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: string, vars?: Vars): string {
  const own = DICTS[lang]?.[key];
  const found = own !== undefined ? own : en[key] ?? key;

  /*
   * `{name}` is replaced wherever it appears. A gap with nothing to put in it
   * is left as it is rather than emptied: a sentence missing a number reads
   * as a fault and gets reported, and one that quietly lost it does not.
   */
  const filled = vars
    ? found.replace(/\{(\w+)\}/g, (whole, name: string) =>
        vars[name] === undefined ? whole : String(vars[name]),
      )
    : found;

  const borrowed = own === undefined;
  return borrowed && dirFor(lang) === 'rtl' ? FSI + filled + PDI : filled;
}
