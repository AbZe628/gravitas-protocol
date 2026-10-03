import { useState } from 'react';
import { keep, kept } from '../lib/kept.js';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';

/**
 * That this language has not been read by anybody who works in it.
 *
 * ── why it is said at all ─────────────────────────────────────────────────
 *
 * Every sentence is translated and every language does the same things, but
 * the Arabic and the Urdu are mine and nobody who works in those languages
 * and in this field has read them. A board that met an awkward sentence three
 * screens in would reasonably conclude the software is broken rather than the
 * wording is a draft. So it is said, in the language it is about, before a
 * reader has to guess.
 *
 * ── and why it is one line ────────────────────────────────────────────────
 *
 * It was a panel: the sentence, then the paragraph under it, above every
 * screen. Measured on a phone in Urdu it came to **329 pixels** of 812 — and
 * with the bars above it the first row of work began at 652, so a member saw
 * the name of the screen, this notice, and one row. The notice about the
 * wording was taking four times the room of the work it was about.
 *
 * One line, which opens to the paragraph if a reader wants it, and closes for
 * good. Nothing is removed: the whole of it is one press away, and it is not
 * removed from the first screen either — what changes is that it stops being
 * the screen.
 *
 * ── remembered per language, and only for this visit ──────────────────────
 *
 * Per language, because closing it for Urdu says nothing about the Arabic; a
 * reader who switches is owed the sentence again. Only for this visit, in
 * `kept`, which is where this application keeps what a screen had rather than
 * in anything the next person at this machine could read — and a reader who
 * comes back tomorrow is owed it again anyway.
 */
export default function ADraftTranslation({ lang }: { lang: string }) {
  const { t } = useI18n();
  const name = 'lang.draft.' + lang;
  const [shut, setShut] = useState(() => kept<boolean>(name) === true);
  const [open, setOpen] = useState(false);

  if (shut) return null;

  function close() {
    keep(name, true);
    setShut(true);
  }

  return (
    <div className="mb-5 rounded-card bg-raised/70 px-4 py-2.5 shadow-ring">
      <div className="flex items-center gap-2">
        {/*
          The sentence is the control that opens the rest of it, so a reader
          who wants the why presses the thing they are already reading. It is
          a button and not a line of type with a link in it, because this
          application draws no act as an underlined word.
        */}
        <Button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-start text-ui leading-snug text-muted hover:text-paper"
        >
          <span className="min-w-0 flex-1">{t('lang.notReady')}</span>
          <svg
            width="11"
            height="7"
            viewBox="0 0 12 8"
            aria-hidden="true"
            className={'shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}
          >
            <path
              d="M1.5 1.5 6 6 10.5 1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
        <Button
          type="button"
          onClick={close}
          aria-label={t('lang.notReadyClose')}
          className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-muted hover:text-paper"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M2 2l10 10M12 2L2 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </Button>
      </div>
      {open && (
        <p className="mb-1 max-w-[62ch] text-note leading-loose text-muted">
          {t('lang.notReadyBody')}
        </p>
      )}
    </div>
  );
}
