import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dirFor, isLoaded, loadLang, translate, type Lang, type Vars } from '../locales/index.js';

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /**
   * The sentence, in the reader's language.
   *
   * `vars` fills the gaps in sentences the work grammar counts things into —
   * *{left} of {total} conditions are unanswered*. Optional, so every call
   * written before it stays as it was.
   */
  t: (key: string, vars?: Vars) => string;
  /**
   * The same, for a sentence the server chose.
   *
   * The server decides *which* sentence and sends its key and figures — see
   * `Say` in `lib/api.ts`. It is `t` with the two halves already packed
   * together, so a step's act reads `say(step.act)` rather than
   * `t(step.act.key, step.act.vars)` at every one of the fourteen places that
   * draw one.
   *
   * Null and undefined give the empty string. A passage that is settled has no
   * next act, and the alternative is fourteen guards that all say the same
   * thing.
   */
  say: (s: { key: string; vars?: Vars } | null | undefined) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = 'majlis.lang';

/**
 * The language this reader chose last time, or the browser's, or English.
 *
 * Exported for `main.tsx`, which fetches it before the first screen is drawn.
 */
export function initialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  let stored: string | null = null;
  try {
    stored = window.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    /* storage refused — a private window, or site data blocked */
  }
  if (stored === 'en' || stored === 'ar' || stored === 'ur') return stored;
  const nav = window.navigator?.language?.slice(0, 2);
  if (nav === 'ar' || nav === 'ur') return nav;
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  /*
   * The first language is the one `main.tsx` already fetched. If that fetch
   * failed the page is in English, which is what the reader is actually being
   * shown, rather than in a language whose sentences are not here.
   */
  const [lang, setLangState] = useState<Lang>(() => {
    const first = initialLang();
    return isLoaded(first) ? first : 'en';
  });
  const dir = dirFor(lang);

  /*
   * A language is fetched before it is switched to, so the screen changes once
   * — from one whole language to the other — and never shows the fallback
   * English in a right-to-left frame while the chunk is on its way. One
   * already here switches in the same tick, as it always did.
   */
  const setLang = useMemo(
    () => (l: Lang) => {
      if (isLoaded(l)) setLangState(l);
      else loadLang(l).then(() => setLangState(l), () => undefined);
    },
    [],
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      window.localStorage?.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable; language still applies for this session */
    }
  }, [lang, dir]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key: string, vars?: Vars) => translate(lang, key, vars),
      say: (s) => (s ? translate(lang, s.key, s.vars) : ''),
      dir,
    }),
    [lang, dir, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
