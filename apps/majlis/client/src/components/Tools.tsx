import { useState } from 'react';
import SlideOver from './SlideOver.js';
import Screening from './Screening.js';
import Purification from './Purification.js';
import Zakat from './Zakat.js';
import Distribution from './Distribution.js';
import Tradability from './Tradability.js';
import LatePayment from './LatePayment.js';
import Recorded from './Recorded.js';
import { useI18n } from '../lib/i18n.js';

/**
 * The toolkits, in a slide, reachable from anywhere.
 *
 * ── the hole this fills ───────────────────────────────────────────────────
 *
 * > You removed the things from the side. How will anyone reach any toolkit?
 *
 * A fair question with no answer. Calculations came off the rail when it was
 * cut to the nine places the drawing shows, and nothing replaced it, so the
 * six calculators became reachable only from inside a step that happened to
 * call for one. A member who simply wants to work a purification out had
 * nowhere to go.
 *
 * ── two ways in, and they are different on purpose ────────────────────────
 *
 * **In a step**, the application opens the one the step needs. Which one is
 * named by the contract shape, never guessed from the wording, and what is
 * worked out there is recorded against that condition.
 *
 * **From here**, the member picks. Nothing is recorded against anything; it is
 * arithmetic they wanted done. Recording is a separate act and the panel says
 * so, because a scholar who works something out and assumes it was filed has
 * been misled by the interface rather than by the record.
 *
 * ── and it is a slide, not a page ─────────────────────────────────────────
 *
 * Opening a calculator should not take a member off the matter, the register
 * or the meeting they were reading. It opens beside what they were doing and
 * closes back to it.
 */

type Kind =
  | 'screening'
  | 'purification'
  | 'zakat'
  | 'distribution'
  | 'tradability'
  | 'late'
  | 'recorded';

const KINDS: readonly Kind[] = [
  'screening',
  'purification',
  'zakat',
  'distribution',
  'tradability',
  'late',
  'recorded',
];

/** The dictionary already names all seven for the step that opens them. */
const LABEL: Record<Kind, string> = {
  screening: 'calc.tab.screening',
  purification: 'calc.tab.purification',
  zakat: 'calc.tab.zakat',
  distribution: 'calc.tab.distribution',
  tradability: 'calc.tab.tradability',
  late: 'calc.tab.late',
  recorded: 'calc.tab.recorded',
};

export default function Tools({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<Kind>('screening');

  return (
    <SlideOver open={open} title={t('tools.title')} says={t('tools.says')} onClose={onClose}>
      {/* Which one. A row of real tabs, not a menu to read. */}
      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-line pb-3">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-current={kind === k ? 'true' : undefined}
            className={
              'rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ' +
              (kind === k
                ? 'bg-lapis font-semibold text-white'
                : 'bg-ink text-sand shadow-ring hover:text-paper')
            }
          >
            {t(LABEL[k])}
          </button>
        ))}
      </div>

      {kind === 'screening' && <Screening />}
      {kind === 'purification' && <Purification />}
      {kind === 'zakat' && <Zakat />}
      {kind === 'distribution' && <Distribution />}
      {kind === 'tradability' && <Tradability />}
      {kind === 'late' && <LatePayment />}
      {kind === 'recorded' && <Recorded />}

      {/*
        Said here rather than discovered afterwards. Working a figure out and
        recording it are two acts, and this panel does only the first.
      */}
      {kind !== 'recorded' && (
        <p className="mt-5 rounded-card bg-ink px-4 py-3 text-[12.5px] leading-[1.6] text-muted">
          {t('calc.recordingIsSeparate')}
        </p>
      )}
    </SlideOver>
  );
}
