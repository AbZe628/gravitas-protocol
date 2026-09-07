import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';

/**
 * The guide, present on every screen.
 *
 * The complaint this answers: *an application full of good solutions nobody
 * will ever discover.* A board member meets words Majlis never explains —
 * matter, direction, timelock, drift, standing, adoption — and screens whose
 * purpose is obvious only to whoever built them. Documentation nobody opens is
 * not an answer, so the application can be asked about itself from wherever
 * somebody happens to be standing.
 *
 * ── it is not the assistant, and the difference is the point ──────────────
 *
 * Nothing here is generated and no question leaves the building. The subject is
 * **Majlis** — what a screen is for, what a word means, what an act does, what
 * happens next. That is knowledge the codebase has, so the answer is instant,
 * identical every time, and available in the installations that have no
 * assistant, which is most of them.
 *
 * It does not say whether anything is permissible. A guide is a likelier place
 * to be asked than the assistant is, because it is the thing that looks like it
 * will answer anything — so the refusal is on the server, ahead of any
 * matching, and it offers what the guide can properly do rather than stopping.
 *
 * ── open, it is a panel and not a takeover ────────────────────────────────
 *
 * Anchored to the corner, sized to be read, and it closes on Escape. A reader
 * asking what a word means has not stopped doing the thing they were doing.
 */

interface Answer {
  topic: string | null;
  answer: string;
  goTo: { label: string; path: string } | null;
  seeAlso: string[];
  refused: boolean;
}

/** Openers, so a reader need not compose a question to get anything. */
const STARTERS = ['start', 'matter', 'vote', 'drift'] as const;

export default function Guide() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    box.current?.focus();
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);

  /*
   * The phone opens this from the tab bar rather than from a floating pill.
   *
   * An event rather than lifted state: the guide owns whether it is open, and
   * hoisting that into the shell would put a panel's private business in the
   * frame that every screen renders. The shell asks; this answers.
   */
  useEffect(() => {
    const asked = () => setOpen(true);
    window.addEventListener('majlis:guide', asked);
    return () => window.removeEventListener('majlis:guide', asked);
  }, []);

  async function ask(asked: string) {
    if (asked.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      /*
        A read, so a GET. Nothing here changes anything.

        The language goes with the question. Until it did, a scholar reading the
        Arabic interface asked in Arabic and got the answer in English, which is
        the one place the application had a language and did not use it.
      */
      const res = await fetch(
        '/api/guide?q=' + encodeURIComponent(asked) + '&lang=' + encodeURIComponent(lang),
      );
      if (res.ok) setAnswer((await res.json()) as Answer);
    } catch {
      // Nothing is lost: the reader can ask again, and the page they were on
      // is untouched.
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 end-5 z-40 hidden items-center gap-2 rounded-full bg-raised lg:flex px-4 py-2.5 text-[13px] font-medium text-sand shadow-[0_0_0_0.5px_rgba(25,23,19,0.08),0_2px_6px_rgba(25,23,19,0.09),0_14px_30px_-10px_rgba(25,23,19,0.3)] transition-all hover:-translate-y-px hover:text-paper"
      >
        <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1 L9.6 6.4 L15 8 L9.6 9.6 L8 15 L6.4 9.6 L1 8 L6.4 6.4 Z" fill="#B08430" />
        </svg>
        {t('guide.open')}
      </button>
    );
  }

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] end-5 z-40 w-[min(26rem,calc(100vw-2.5rem))] lg:bottom-5">
      <div className="rounded-sheet bg-raised shadow-[0_0_0_0.5px_rgba(25,23,19,0.08),0_2px_6px_rgba(25,23,19,0.09),0_24px_48px_-16px_rgba(25,23,19,0.35)]">
        {/* `items-start` and a `shrink-0` close: on a phone the scope line
            wraps to two, and centred with a flexible close the × sat on top
            of the second line. */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-paper">{t('guide.title')}</div>
            {/* What it is for, and what it is not, in one line. */}
            <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{t('guide.scope')}</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('guide.close')}
            className="-me-1 shrink-0 rounded-lg px-1.5 text-[18px] leading-none text-muted transition-colors hover:text-paper"
          >
            ×
          </button>
        </div>

        <div className="max-h-[22rem] overflow-y-auto px-4 py-3.5">
          {answer ? (
            <>
              <p
                className={
                  'text-[13.5px] leading-[1.6] ' + (answer.refused ? 'text-attention' : 'text-sand')
                }
              >
                {answer.answer}
              </p>

              {answer.goTo && (
                <Link
                  to={answer.goTo.path}
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-block text-[13px] text-gold underline decoration-gold/40 underline-offset-4"
                >
                  {answer.goTo.label} →
                </Link>
              )}

              {/* What a reader is likely to want next, asked with one press. */}
              {answer.seeAlso.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {answer.seeAlso.map((next) => (
                    <button
                      key={next}
                      type="button"
                      onClick={() => {
                        setQuestion(t(`guide.ask.${next}`));
                        void ask(t(`guide.ask.${next}`));
                      }}
                      className="rounded-full shadow-ring px-2.5 py-1 text-[12px] text-muted transition-colors hover:text-paper"
                    >
                      {t(`guide.ask.${next}`)}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-[13.5px] leading-[1.6] text-sand">{t('guide.intro')}</p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuestion(t(`guide.ask.${s}`));
                      void ask(t(`guide.ask.${s}`));
                    }}
                    className="rounded-full shadow-ring px-2.5 py-1 text-[12px] text-muted transition-colors hover:text-paper"
                  >
                    {t(`guide.ask.${s}`)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
          className="flex gap-2 border-t border-line px-4 py-3"
        >
          <input
            ref={box}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('guide.placeholder')}
            className="w-full rounded-card shadow-ring bg-raised px-3 py-2 text-[13.5px] outline-none transition-colors focus:shadow-[0_0_0_1.5px_rgba(22,68,112,0.35)]"
          />
          <button
            type="submit"
            disabled={busy || question.trim().length < 2}
            className="rounded-xl bg-lapis px-3.5 text-[13px] font-semibold text-white shadow-act transition-all hover:bg-lapissoft disabled:opacity-30"
          >
            {t('guide.ask')}
          </button>
        </form>
      </div>
    </div>
  );
}
