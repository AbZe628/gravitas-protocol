import { useState } from 'react';
import { oversight, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import Act from './Act.js';
import { Button } from './Button';
import { Field } from './field.js';
import SlideOver from './SlideOver.js';

const HEADING = 'mb-1 text-label font-bold uppercase tracking-caps text-muted';

/**
 * The board says how often a ruling comes back — or that it does not.
 *
 * ── the step that arrived and could not be done ───────────────────────────
 *
 * A ruling in force with no interval already said *nothing will bring this
 * back before the board*, and the passage already carried that as an open step
 * of the board's own, so it sat in every signatory's queue. Nothing in the
 * application wrote a rule at all: no route, and no method on the store. The
 * one piece of work the clock creates by itself was the one piece nobody could
 * do, and the screen for it offered *look at this again* — which opens a
 * matter about the ruling, and is a different thing entirely.
 *
 * ── it does not choose the number ─────────────────────────────────────────
 *
 * There is no suggested interval and no default. Some rulings rest on a rate
 * that moves weekly and some on a structure that has not changed in twenty
 * years, and a figure offered here would be this file setting the board's own
 * review policy. The board types the number.
 *
 * ── and it lets them mean never ───────────────────────────────────────────
 *
 * `services/review.ts` refuses an interval longer than five years, saying a
 * board that means *never* should say so rather than encode it as a long wait.
 * It had no way to say so. Saying it is an entry like any other — a name, a
 * date and a reason — and the ruling then reads as one the board decided does
 * not come back on a clock, which is not the same as one nobody has answered.
 */
export default function HowOftenItComesBack({
  rule,
  canSay,
  onSaid,
}: {
  rule: Rule;
  /** Whether this member's credential carries the act. The route refuses the rest. */
  canSay: boolean;
  onSaid: () => void;
}) {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [saying, setSaying] = useState(false);
  /** Empty until the board types one. A number here would be a default nobody chose. */
  const [months, setMonths] = useState('');
  const [onAClock, setOnAClock] = useState(true);

  if (!canSay) return null;

  const figure = Number(months);
  const ready = onAClock ? Number.isInteger(figure) && figure > 0 && figure <= 60 : true;

  const form = (
    <div className="mt-3 rounded-card bg-ink px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-ui leading-relaxed text-muted">{t('interval.lead')}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          type="button"
          tone={onAClock ? 'act' : 'plain'}
          size="sm"
          onClick={() => setOnAClock(true)}
        >
          {t('interval.onAClock')}
        </Button>
        <Button
          type="button"
          tone={onAClock ? 'plain' : 'act'}
          size="sm"
          onClick={() => setOnAClock(false)}
        >
          {t('interval.noClock')}
        </Button>
      </div>

      {onAClock ? (
        <Field label={t('interval.months')} help={t('interval.monthsHelp')} headingClass={HEADING}>
          {(attrs) => (
            <input
              {...attrs}
              value={months}
              inputMode="numeric"
              onChange={(e) => setMonths(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-28 rounded-card bg-raised px-4 py-2.5 text-body tabular-nums text-paper shadow-ring outline-none"
            />
          )}
        </Field>
      ) : (
        <p className="max-w-[58ch] text-ui leading-relaxed text-sand">{t('interval.noClockMeans')}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button
          type="button"
          tone="act"
          size="md"
          disabled={!ready}
          onClick={() => setSaying(true)}
        >
          {t('interval.record')}
        </Button>

        <Act
          open={saying}
          onClose={() => setSaying(false)}
          title={t('interval.record')}
          does={onAClock ? t('interval.does', { months: figure }) : t('interval.doesNoClock')}
          means={t('interval.means')}
          label={t('interval.record')}
          reason={{ label: t('interval.why'), help: t('interval.whyHelp'), required: true }}
          perform={async ({ reason, sending }) => {
            await oversight.setReviewInterval(
              rule.id,
              { everyMonths: onAClock ? figure : null, reason },
              sending,
            );
            setOpen(false);
            onSaid();
          }}
          after={{
            did: onAClock ? t('interval.did', { months: figure }) : t('interval.didNoClock'),
            means: t('interval.didMeans'),
            next: [],
          }}
        />

        <Button
          tone="plainquiet"
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-[44px] items-center text-ui lg:min-h-0 lg:py-1"
        >
          {t('common.back')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Button type="button" tone="act" size="md" onClick={() => setOpen(true)}>
        {t('interval.say')}
      </Button>
      <SlideOver open={open} title={t('interval.say')} onClose={() => setOpen(false)}>
        {form}
      </SlideOver>
    </>
  );
}
