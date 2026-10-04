import type { ContractReading } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';

/**
 * Where this one condition is answered in the draft, on the step that asks it.
 *
 * ── the gap ───────────────────────────────────────────────────────────────
 *
 * The reading exists and is good: it says where each condition is answered in
 * the text, quotes the sentence, and refuses to call anything met. It lives in
 * the matter's papers, and the conditions are answered one to a step, each on
 * a screen of its own. So a member who read the draft on the way in answered
 * condition four from memory, or went back, found the reading, scrolled to the
 * fourth row, read the sentence, came forward again, and typed it out.
 *
 * The sentence belongs on the step the sentence is about.
 *
 * ── and what it is not, which is the whole product ────────────────────────
 *
 * It suggests **nothing** about the finding. *Answered* is not *met*: a clause
 * can be present and wrong, present and contradicted three pages later, or
 * present in words that do not mean what the condition means. No button here
 * fills in a verdict, and none of the three findings is preselected — the only
 * thing it offers to carry across is the quoted sentence, into the reason,
 * where it is evidence a member is citing rather than an answer a machine gave.
 *
 * It also says which of the two readers produced it, because they disagree and
 * a board must never have to guess which one it is looking at.
 *
 * ── absent where there is no reading ──────────────────────────────────────
 *
 * Nothing is kept: a draft pasted in to see what the board would ask about is
 * not a document of the record, and keeping it would make it one without
 * anybody deciding that. So this is here for as long as the member is working
 * through the matter they read it on, and on a matter nobody read a draft for
 * there is nothing to draw — not an empty panel advertising a feature on every
 * one of twenty steps.
 */

/**
 * A sentence from the draft, put into a reason that is already being written.
 *
 * Added to what the member has, never over it: a reason already typed is
 * theirs, and a quote is something they are citing in it.
 *
 * Here rather than at the screen that calls it, so the rule has one owner and
 * a test of it is a test of what runs. Written at the call site, the screen
 * and the measure held two copies of it and breaking one of them failed
 * nothing.
 */
export function cite(was: string, sentence: string): string {
  const quoted = `“${sentence}”`;
  return was.trim().length === 0 ? quoted : `${was}\n\n${quoted}`;
}

export default function WhatTheDraftSays({
  reading,
  conditionId,
  onQuote,
}: {
  reading: ContractReading | null;
  conditionId: string;
  /** Carries the sentence into the reason. Absent where the reader may not rule. */
  onQuote?: (sentence: string) => void;
}) {
  const { t } = useI18n();
  if (!reading) return null;

  const found = reading.conditions.find((c) => c.conditionId === conditionId);
  if (!found) return null;

  const word =
    found.standing === 'found'
      ? t('read.found')
      : found.standing === 'unclear'
        ? t('read.unclear')
        : t('read.absent');

  return (
    <section
      aria-label={t('draft.says.title')}
      className="mb-5 rounded-card bg-raised px-4 py-3.5 shadow-ring"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-label font-bold uppercase tracking-caps text-muted">
          {t('draft.says.title')}
        </span>
        {/*
          The word the reading uses, in no colour of its own. It is a statement
          about the text, not about the condition, and a green *Answered* beside
          three findings is the screen leaning on one of them.
        */}
        <span className="text-ui font-semibold text-paper">{word}</span>
        <span className="text-note text-muted">
          · {t(reading.readBy === 'model' ? 'read.byModel' : 'read.byWords')}
        </span>
      </div>

      <p className="mb-2.5 max-w-[62ch] text-ui leading-relaxed text-muted">{found.note}</p>

      {found.passages.length > 0 && (
        <ul className="mb-2.5 space-y-2">
          {found.passages.map((p, i) => (
            <li key={i} className="border-s-2 border-line ps-3.5">
              <p className="max-w-[62ch] font-read text-lead leading-relaxed text-sand">
                “{p.text}”
              </p>
              {onQuote && (
                <Button
                  type="button"
                  onClick={() => onQuote(p.text)}
                  className="mt-1.5 rounded-lg bg-ink px-3 py-1.5 text-note text-lapis shadow-ring hover:text-paper"
                >
                  {t('draft.says.quote')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/*
        Said under it every time, not once at the top of the reading it came
        from: this screen is where the finding is made, and a member who
        arrived straight at step four never saw that page.
      */}
      <p className="max-w-[62ch] text-note leading-relaxed text-muted">
        {t('draft.says.notAFinding')}
      </p>
    </section>
  );
}
