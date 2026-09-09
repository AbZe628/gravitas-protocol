import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Recognition, type SubmittedDraft } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * The contract that came with the question, and what to do with it.
 *
 * ── the flow this closes ──────────────────────────────────────────────────
 *
 * A bank's commonest question is *here is a contract, is it acceptable*. Until
 * now it arrived with the contract missing — `attachments` was a list of
 * filenames capped at 200 characters, so a desk could write *the murabaha
 * agreement is attached* and nothing was — and the board's own reader, the one
 * feature the competing products are bought for, had nothing to read.
 *
 * Now the words travel with the question. This shows them, and it does the
 * step a scholar cannot do for themselves: the reader needs a shape named
 * before it can read, from nineteen, and nobody can name one without having
 * read the document already.
 *
 * ── it suggests and does not decide ───────────────────────────────────────
 *
 * What is offered is a ranking with its working: how many of each shape's
 * conditions have their words in this draft, and — where the draft names a
 * shape itself — that it does. A scholar presses one and gets the real
 * reading. Nothing here says what the contract is; the top of a list is where
 * the most matching words are.
 */
export default function TheDraftThatCame({
  draft,
  submissionId,
}: {
  draft: SubmittedDraft;
  /**
   * So the words travel with the press.
   *
   * Without it the suggestion landed on an empty box with the shape chosen,
   * and a scholar who had just been shown the contract had to go and find it
   * again and paste it. One click has to arrive at the reading, not at the
   * form that would produce the reading.
   */
  submissionId: string;
}) {
  const { t } = useI18n();
  const [guessed, setGuessed] = useState<Recognition | null>(null);
  const [showing, setShowing] = useState(false);

  /*
   * Recognised as the queue renders, not on a press.
   *
   * A scholar opening the queue should already be looking at the answer. It is
   * one request against text the board already has, and a failure costs the
   * suggestions and nothing else — the draft is still there to read.
   */
  useEffect(() => {
    let live = true;
    oversight
      .recognise(draft.text)
      .then((r) => live && Array.isArray(r?.guesses) && setGuessed(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [draft.text]);

  return (
    <section className="mt-3.5 rounded-card bg-raised px-4 py-3.5 shadow-ring">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {t('camewith.title')}
        </span>
        <span className="font-mono text-[11.5px] text-muted">
          {draft.text.length} {t('draftfrom.characters')}
        </span>
      </div>

      <div className="mt-1.5 text-[13.5px] text-paper">{draft.name}</div>

      {/*
        The shapes whose conditions use words that are in this draft. Pressing
        one opens the reading against exactly those conditions, which is the
        step that used to require choosing blind from nineteen.
      */}
      {guessed && guessed.guesses.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-[12px] text-muted">{t('camewith.looksLike')}</div>
          <ul className="flex flex-wrap gap-2">
            {guessed.guesses.map((g) => (
              <li key={g.structureId}>
                <Link
                  to={`/check?shape=${encodeURIComponent(g.structureId)}&from=${encodeURIComponent(submissionId)}`}
                  className="block max-w-[34ch] rounded-xl bg-ink/60 px-3.5 py-2 text-[12.5px] text-sand shadow-ring transition-colors hover:text-paper"
                >
                  <span className="block truncate">{g.name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    {g.namedInTheDraft
                      ? `${t('camewith.namesItself')} “${g.namedInTheDraft}”`
                      : `${g.found + g.partly} ${t('camewith.ofConditions')} ${g.of}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 max-w-[62ch] text-[11.5px] leading-[1.6] text-muted">
            {guessed.note}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowing((was) => !was)}
        className="mt-3 text-[12.5px] font-semibold text-lapis underline decoration-line underline-offset-4"
      >
        {t(showing ? 'camewith.hide' : 'camewith.show')}
      </button>

      {showing && (
        <pre className="mt-2.5 max-h-[22rem] overflow-auto whitespace-pre-wrap rounded-xl bg-ink px-3.5 py-3 font-mono text-[12px] leading-[1.6] text-sand">
          {draft.text}
        </pre>
      )}
    </section>
  );
}
