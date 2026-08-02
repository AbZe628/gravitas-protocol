import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dirFor, translate, type Lang } from '../locales/index.js';

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = 'majlis.lang';

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage?.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ar' || stored === 'ur') return stored;
  const nav = window.navigator?.language?.slice(0, 2);
  if (nav === 'ar' || nav === 'ur') return nav;
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = dirFor(lang);

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
      setLang: setLangState,
      t: (key: string) => translate(lang, key),
      dir,
    }),
    [lang, dir],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
