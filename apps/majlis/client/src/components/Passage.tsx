import { useEffect, useState } from 'react';
import { oversight, type Passage as Passage_, type PassageStep } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';

/**
 * Where this matter stands, and what the next act is.
 *
 * Everything a board needs to answer a question was already on this page. What
 * was missing is the **order**: twelve panels down a screen, none of them
 * saying which comes next or whose it is. A member who has done this before
 * knows. One who has not cannot tell whether the matter is nearly decided or
 * barely begun, and that is the difference between a set of tools and something
 * a scholar can be handed.
 *
 * ── one sentence first ────────────────────────────────────────────────────
 *
 * The panel leads with a single line: **the next act, and whose it is.** A
 * scholar opening a matter on a phone between two other things wants one
 * sentence, and every other thing on this panel is subordinate to it.
 *
 * ── and it does not become a checklist ────────────────────────────────────
 *
 * There is no count, no bar and no percentage, and that is deliberate rather
 * than an omission. A meter reading 7/12 invites finishing the meter, and the
 * one judgement this application may never make is that a question is well
 * enough put to be decided. So the steps say what is in the record and what is
 * not, in words, and the board decides what an unfinished one means.
 *
 * The two groups are shaped differently because they are different. **Putting
 * the question in shape** happens in whatever order the work happens — a member
 * reads a source and it changes the terms — so it is a set, unnumbered.
 * **Deciding** genuinely waits on itself, and the lifecycle refuses to reorder
 * it, so it is a sequence.
 *
 * One step is marked as actually refused by the system; the rest are the
 * board's to skip. Showing an unmet convention as a locked gate would turn
 * guidance into administration, which is the thing this record exists to
 * prevent.
 */

const DOT: Record<PassageStep['state'], string> = {
  done: 'bg-settled',
  open: 'bg-gold ring-[3px] ring-gold/25',
  ahead: 'bg-line',
  skipped: 'border border-dashed border-muted/60',
  not_applicable: 'border border-line',
};

function Step({ step, ordinal }: { step: PassageStep; ordinal?: number }) {
  const { t } = useI18n();
  const dim = step.state === 'ahead' || step.state === 'not_applicable' || step.state === 'skipped';

  return (
    <li className="flex gap-3">
      <span className="flex shrink-0 flex-col items-center pt-[6px]">
        <span className={'h-2 w-2 rounded-full ' + DOT[step.state]} />
      </span>

      <div className="min-w-0 flex-1 pb-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {ordinal !== undefined && (
            <span className="font-mono text-note tabular-nums text-muted">{ordinal}</span>
          )}
          <span className={'text-ui ' + (dim ? 'text-muted' : 'text-paper')}>{step.act}</span>
          {/* Whose it is, on every step. The commonest way a matter stalls is
              that everyone believes it is with somebody else. */}
          <span className="text-label font-bold uppercase tracking-caps text-muted">
            {t(`passage.whose.${step.whose}`)}
          </span>
          {step.state === 'done' && (
            <span className="text-note text-gold/70">{t('passage.done')}</span>
          )}
          {step.enforced && step.state === 'open' && (
            <span className="rounded-full px-2.5 py-0.5 text-label font-bold uppercase tracking-label bg-goldtint text-gold shadow-ringgold">
              {t('passage.enforced')}
            </span>
          )}
        </div>

        {step.standing && (
          <p className="mt-1 text-note leading-relaxed text-muted">{step.standing}</p>
        )}
      </div>
    </li>
  );
}

export default function Passage({ matterId }: { matterId: string }) {
  const { t } = useI18n();
  const [passage, setPassage] = useState<Passage_ | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    oversight
      .passage(matterId)
      /*
       * The shape is checked, not assumed.
       *
       * Not knowing is a state the interface handles: the matter below is
       * readable without this panel, and a broken spine must not take the page
       * with it. That means guarding against a 200 carrying something else —
       * an older server, a proxy's error page — as well as against a failed
       * request, because only one of the two arrives in `catch`.
       */
      .then((p) => live && Array.isArray(p?.shaping) && Array.isArray(p?.deciding) && setPassage(p))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [matterId]);

  if (!passage) return null;

  return (
    <div className="mb-6 rounded-sheet bg-raised px-6 py-5 shadow-card">
      {/*
        The one sentence. A scholar opening this on a phone between two other
        things wants to know what now, and whether it is theirs.
      */}
      {passage.next ? (
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="mb-2.5 text-label font-bold uppercase tracking-caps text-muted">
              {t('passage.next')}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-display text-title leading-snug tracking-title">
                {passage.next.act}
              </span>
              {/* Whose act it is, as a state rather than as a caption stuck
                  to the end of the sentence. */}
              <span className="rounded-full bg-black/[0.045] px-2.5 py-0.5 text-label font-bold uppercase tracking-label text-sand">
                {t(`passage.whose.${passage.next.whose}`)}
              </span>
            </div>
            {passage.next.standing && (
              <p className="mt-2.5 max-w-[62ch] text-ui leading-relaxed text-muted">
                {passage.next.standing}
              </p>
            )}
          </div>

          {/*
            How long, and on whom. UX §6 calls this the number the product is
            sold on: the first time anyone can see what the board is costing the
            business. It is never a reproach — a matter in the delay waits on a
            clock and nobody is holding it up.
          */}
          {passage.waiting && (
            <div className="shrink-0 text-end">
              <div className="font-display text-display leading-none tabular-nums tracking-display text-gold">
                {passage.waiting.days}
              </div>
              <div className="mt-1.5 text-note text-muted">{t('passage.days')}</div>
            </div>
          )}
        </div>
      ) : (
        <p className="max-w-[62ch] font-display text-sub leading-relaxed">{passage.settled}</p>
      )}

      {passage.waiting && (
        <p className="mt-3 max-w-[62ch] text-note leading-relaxed text-muted">{passage.waiting.note}</p>
      )}

      <Button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="mt-4 rounded-xl bg-ink px-3.5 py-2 text-ui text-sand shadow-ring transition-colors hover:text-paper"
      >
        {open ? t('passage.hide') : t('passage.show')}
      </Button>

      {open && (
        <div className="mt-5 grid gap-7 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
              {t('passage.shaping')}
            </div>
            {/* Unnumbered on purpose: the order is the work's, not ours. */}
            <p className="mb-2.5 text-note leading-relaxed text-muted">
              {t('passage.shaping.hint')}
            </p>
            <ul>
              {passage.shaping.map((s) => (
                <Step key={s.key} step={s} />
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
              {t('passage.deciding')}
            </div>
            <p className="mb-2.5 text-note leading-relaxed text-muted">
              {t('passage.deciding.hint')}
            </p>
            <ul>
              {passage.deciding.map((s, i) => (
                <Step key={s.key} step={s} ordinal={i + 1} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
