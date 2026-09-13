import { useState } from 'react';
import { useI18n } from '../lib/i18n.js';
import { WorkedOutForProvider } from '../lib/workedOutFor.js';
import Screening from './Screening.js';
import Purification from './Purification.js';
import Zakat from './Zakat.js';
import Distribution from './Distribution.js';
import Tradability from './Tradability.js';
import LatePayment from './LatePayment.js';

/**
 * The calculator, inside the step that needs it.
 *
 * ── the thing the handbook asked for ──────────────────────────────────────
 *
 * *A step that needs a figure opens the calculator inside itself.* Until now
 * every calculator lived at `/calculations` and opened from nowhere else, so a
 * scholar on a condition about a ratio had to leave the case, find the right
 * one of six, work it out, record it, and come back to a step that showed no
 * sign any of it had happened.
 *
 * ── which calculator, and why it is not guessed ───────────────────────────
 *
 * Each contract shape names the calculations it uses — `calculations` on the
 * structure, written with the shape and not inferred from the wording of a
 * condition. Where a shape names one, that is the one a figure step opens.
 * Where it names several, the member chooses, because which of the three
 * answers this particular condition is a judgement and this file does not
 * make judgements.
 *
 * Where a shape names none, the step says so rather than opening an arbitrary
 * calculator. A condition that needs a figure the board has no calculator for
 * is a real state, and the member works it out however they already do.
 *
 * ── what it produces stays on the condition ───────────────────────────────
 *
 * The provider above it carries the case and the condition, so whatever is
 * recorded here is recorded against this step. That is the whole point: the
 * answer has to end up on the question.
 */

export type CalculationKind =
  | 'screening'
  | 'purification'
  | 'zakat'
  | 'profit_distribution'
  | 'tangibility'
  | 'late_payment';

const KNOWN: CalculationKind[] = [
  'screening',
  'purification',
  'zakat',
  'profit_distribution',
  'tangibility',
  'late_payment',
];

function One({ kind }: { kind: CalculationKind }) {
  if (kind === 'screening') return <Screening />;
  if (kind === 'purification') return <Purification />;
  if (kind === 'zakat') return <Zakat />;
  if (kind === 'profit_distribution') return <Distribution />;
  if (kind === 'tangibility') return <Tradability />;
  return <LatePayment />;
}

export default function TheCalculator({
  matterId,
  conditionId,
  offered,
  onWorked,
}: {
  matterId: string;
  conditionId: string;
  /** What the shape says it uses. Never inferred from the condition's wording. */
  offered: string[];
  /** Told when a figure lands, so the step shows it without a reload. */
  onWorked?: () => void;
}) {
  const { t } = useI18n();
  const kinds = offered.filter((k): k is CalculationKind =>
    KNOWN.includes(k as CalculationKind),
  );

  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CalculationKind | null>(
    kinds.length === 1 ? kinds[0] : null,
  );

  /*
   * No calculator for this shape. Said, rather than opening one that answers a
   * different question — which would be this file deciding what the condition
   * is about.
   */
  if (kinds.length === 0) {
    return (
      <p className="mt-3 rounded-xl bg-raised/60 px-4 py-2.5 text-[12px] leading-[1.6] text-muted shadow-ring">
        {t('step.noCalculator')}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-xl bg-lapis px-4 py-2 text-[12.5px] font-semibold text-white shadow-act transition-all hover:bg-lapissoft"
      >
        {kinds.length === 1
          ? `${t('step.workItOut')} — ${t(`calc.tab.${kinds[0]}`)}`
          : t('step.workItOut')}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-card bg-ink/70 px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-[12px] leading-[1.6] text-muted">{t('step.calcLead')}</p>

      {/* Which one, where the shape names more than a single calculator. */}
      {kinds.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={picked === k}
              onClick={() => setPicked(k)}
              className={
                'rounded-full px-3.5 py-1.5 text-[12px] transition-all ' +
                (picked === k
                  ? 'bg-lapis font-semibold text-white'
                  : 'bg-raised text-sand shadow-ring hover:text-paper')
              }
            >
              {t(`calc.tab.${k}`)}
            </button>
          ))}
        </div>
      )}

      {picked ? (
        <WorkedOutForProvider value={{ matterId, conditionId, onRecorded: onWorked }}>
          <One kind={picked} />
        </WorkedOutForProvider>
      ) : (
        <p className="text-[12.5px] text-muted">{t('step.whichCalculator')}</p>
      )}

      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-3 text-[12px] text-muted underline decoration-line underline-offset-4"
      >
        {t('step.closeCalculator')}
      </button>
    </div>
  );
}
