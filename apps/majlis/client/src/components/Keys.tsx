import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';

/**
 * What the keyboard does **here**, on one press.
 *
 * ── why it is per screen and not one long list ────────────────────────────
 *
 * A single sheet of every shortcut in an application is a reference document,
 * and a reference document is read once and never again. What a member
 * actually wants is *what can I do from where I am standing*, which is a list
 * of six or seven things and can be held in the head.
 *
 * So the sheet is assembled from where the member is. On a step it names the
 * three findings and the two arrows; on a list it names the arrows and Enter;
 * everywhere it names the palette and the search. Nothing is listed that does
 * not work on the screen the member is looking at, because a shortcut that is
 * advertised and does nothing is worse than one that was never mentioned.
 *
 * ── `?` and not a menu item ───────────────────────────────────────────────
 *
 * Every application a scholar already uses answers `?` with its keys. It is
 * also written into the masthead beside the palette, for the same reason the
 * palette's own key is: a shortcut nobody knows about is not a shortcut.
 */

interface Key {
  press: string;
  does: string;
}

interface Sheet {
  heading: string;
  keys: Key[];
}

/** True on a matter, where a step's own keys apply. */
function atAStep(path: string): boolean {
  return path.startsWith('/matters/') || path.startsWith('/classic/matters/');
}

/** True where a list of rows is the screen. */
function atAList(path: string): boolean {
  return (
    ['/', '/questions', '/register', '/library', '/incidents', '/meetings', '/rules', '/record']
      .includes(path) || path === '/search'
  );
}

function sheetsFor(path: string, t: (k: string) => string): Sheet[] {
  const sheets: Sheet[] = [];

  if (atAStep(path)) {
    sheets.push({
      heading: t('keys.finding'),
      keys: [
        { press: '1', does: t('keys.met') },
        { press: '2', does: t('keys.notMet') },
        { press: '3', does: t('keys.notApplicable') },
        { press: '← →', does: t('keys.steps') },
      ],
    });
  }

  if (atAList(path)) {
    sheets.push({
      heading: t('keys.list'),
      keys: [
        { press: '↑ ↓', does: t('keys.rows') },
        { press: '↵', does: t('keys.openRow') },
      ],
    });
  }

  sheets.push({
    heading: t('keys.anywhere'),
    keys: [
      { press: 'Ctrl K', does: t('keys.palette') },
      { press: '/', does: t('keys.search') },
      { press: 'Esc', does: t('keys.close') },
      { press: '?', does: t('keys.thisSheet') },
    ],
  });

  sheets.push({
    heading: t('keys.writing'),
    keys: [
      { press: 'Tab', does: t('keys.nextField') },
      { press: 'Ctrl ↵', does: t('keys.commit') },
      { press: '@', does: t('keys.mention') },
    ],
  });

  return sheets;
}

export default function Keys({ open, onOpen, onClose }: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const path = useLocation().pathname;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inABox =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));

      /* `?` is a character somebody may be typing. Never steal it from a box. */
      if (e.key === '?' && !inABox) {
        e.preventDefault();
        onOpen();
      }
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpen, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-paper/40 p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('keys.title')}
        className="w-full max-w-[660px] overflow-hidden rounded-sheet bg-raised shadow-sheeted"
      >
        <h2 className="flex items-center gap-3 border-b border-line px-5 py-3.5 font-display text-sub tracking-title">
          {t('keys.title')}
          <kbd className="ms-auto rounded border border-line px-1.5 font-mono text-label font-medium text-faint">
            Esc
          </kbd>
        </h2>

        <div className="grid gap-x-8 gap-y-4 px-5 py-4 sm:grid-cols-2">
          {sheetsFor(path, t).map((sheet) => (
            <section key={sheet.heading}>
              <h3 className="pb-1.5 text-label font-bold uppercase tracking-caps text-faint">
                {sheet.heading}
              </h3>
              <ul className="space-y-1">
                {sheet.keys.map((key) => (
                  <li key={key.press} className="flex items-center gap-3 text-ui text-sand">
                    <kbd className="min-w-[3.2rem] shrink-0 rounded border border-line px-1.5 py-0.5 text-center font-mono text-label font-medium text-faint">
                      {key.press}
                    </kbd>
                    {key.does}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="border-t border-line px-5 py-2.5 text-note leading-snug text-muted">
          {t('keys.onlyWhatWorks')}
        </p>
      </div>
    </div>
  );
}
