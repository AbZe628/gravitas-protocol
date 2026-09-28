import { useEffect } from 'react';
import { matchRoutes, type RouteObject } from 'react-router-dom';
import { EVERY_SCREEN } from '../screens.js';

/**
 * Fetch the screen behind a link before it is pressed.
 *
 * Screens arrive in pieces now (see `screens.ts`), and a piece fetched on the
 * press is a wait after the press — the one moment a person is watching. So
 * the fetch starts earlier, where nobody is waiting:
 *
 * - when a pointer comes to rest on a link, or a finger lands on one, or the
 *   keyboard moves focus to one — the hundred or so milliseconds between
 *   that and the press is usually the whole fetch;
 * - and for every screen, one at a time, once the first is drawn and the
 *   browser has nothing else to do. After that nothing waits at all.
 *
 * The idle fetch is skipped where the reader asked their browser to save
 * data, and in tests, where it would only import every screen into files that
 * render one.
 *
 * One listener on the document rather than one on each link, so a link added
 * tomorrow on any screen is covered without anybody remembering it.
 */
export function usePreloading(routes: RouteObject[]): void {
  useEffect(() => {
    const ahead = (e: Event) => {
      const link = (e.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.origin !== window.location.origin) return;
      for (const m of matchRoutes(routes, link.pathname) ?? []) {
        const screen = (m.route.element as { type?: { preload?: () => Promise<unknown> } } | undefined)?.type;
        void screen?.preload?.().catch(() => undefined);
      }
    };
    document.addEventListener('pointerover', ahead, { passive: true });
    document.addEventListener('touchstart', ahead, { passive: true });
    document.addEventListener('focusin', ahead);

    let stopped = false;
    const saving = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const idle: (f: () => void) => void =
      typeof window.requestIdleCallback === 'function'
        ? (f) => window.requestIdleCallback(f, { timeout: 4000 })
        : (f) => window.setTimeout(f, 300);
    const next = (i: number) => {
      if (stopped || i >= EVERY_SCREEN.length) return;
      idle(() => {
        if (stopped) return;
        EVERY_SCREEN[i]
          .preload()
          .catch(() => undefined)
          .finally(() => next(i + 1));
      });
    };
    const start =
      import.meta.env.MODE === 'test' || saving ? undefined : window.setTimeout(() => next(0), 1500);

    return () => {
      stopped = true;
      if (start !== undefined) window.clearTimeout(start);
      document.removeEventListener('pointerover', ahead);
      document.removeEventListener('touchstart', ahead);
      document.removeEventListener('focusin', ahead);
    };
  }, [routes]);
}
