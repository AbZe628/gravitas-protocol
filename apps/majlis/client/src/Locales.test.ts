import { describe, expect, it } from 'vitest';

import { DICTIONARIES, LANGS, translate } from './locales';

const CODES = LANGS.map((l) => l.code);

/**
 * The dictionaries are read as built objects, not as source lines. A key that
 * appears twice overrides silently, and a spread of `en` inside a literal
 * overwrites every key above it — both leave the file looking complete.
 */
describe('the dictionaries', () => {
  const english = Object.keys(DICTIONARIES.en);

  it('carries every English key in every language', () => {
    for (const lang of CODES) {
      const missing = english.filter((key) => DICTIONARIES[lang][key] === undefined);
      expect({ lang, missing }).toEqual({ lang, missing: [] });
    }
  });

  it('holds no empty string, which reads as a missing label rather than a gap', () => {
    for (const lang of CODES) {
      const blank = Object.entries(DICTIONARIES[lang])
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => key);
      expect({ lang, blank }).toEqual({ lang, blank: [] });
    }
  });

  it('leaves no key untranslated, so nothing falls back to English', () => {
    for (const lang of CODES) {
      if (lang === 'en') continue;
      const same = english.filter(
        (key) =>
          DICTIONARIES[lang][key] === DICTIONARIES.en[key] &&
          // A hint that is a literal identifier or a number is the same in
          // every script; it is a value the board types, not prose.
          !/^[A-Za-z0-9_.\-\s]+$/.test(DICTIONARIES.en[key]),
      );
      expect({ lang, same }).toEqual({ lang, same: [] });
    }
  });

  it('returns the language’s own string, not an isolated fallback', () => {
    for (const lang of CODES) {
      const own = translate(lang, 'common.back');
      expect(own).toBe(DICTIONARIES[lang]['common.back']);
    }
  });
});
