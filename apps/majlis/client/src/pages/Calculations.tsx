import { useState } from 'react';
import { useI18n } from '../lib/i18n.js';
import Distribution from '../components/Distribution.js';
import Purification from '../components/Purification.js';
import Screening from '../components/Screening.js';
import Zakat from '../components/Zakat.js';

/**
 * The arithmetic a board does on its own figures.
 *
 * Until this page existed, three of these four ran on the server and could not
 * be reached from the application at all. A scholar signed into Majlis could
 * read every ruling the board had ever made and could not work out what a
 * holding owed in purification.
 *
 * ── why they are together ─────────────────────────────────────────────────
 *
 * They are the same kind of work: figures the institution supplies, a method
 * the board approved, and arithmetic that shows itself. Screening already sat
 * on the matter page, where it belongs, and it is here too — a scholar who
 * wants to run the ratios on something before raising it should not have to
 * raise it first.
 *
 * ── and what this page cannot do ──────────────────────────────────────────
 *
 * **Nothing computed here is recorded.** Every one of these is stateless by
 * design: the figures are the institution's, and holding them would mean this
 * system asserting a set of numbers it cannot audit. The consequence is real
 * and is stated on the page rather than discovered — a scholar who computes
 * zakat here and closes the tab has computed nothing anybody can point to
 * later, and the annual report still says zakat is not in the record.
 *
 * Somewhere to record a computation against a period is the next piece of
 * work, and it is one piece of work for all four.
 */

type Tab = 'screening' | 'purification' | 'zakat' | 'distribution';

const TABS: Tab[] = ['screening', 'purification', 'zakat', 'distribution'];

export default function Calculations() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('screening');

  return (
    <div>
      <h1 className="mb-1 text-[19px] font-semibold tracking-tight">{t('calc.title')}</h1>
      <p className="mb-4 max-w-prose text-[13px] leading-relaxed text-muted">{t('calc.intro')}</p>

      {/*
        One at a time. Four money forms stacked down a page is furniture, and a
        scholar arrives here for one of them.
      */}
      <div
        role="tablist"
        aria-label={t('calc.title')}
        className="mb-5 flex flex-wrap gap-1 border-b border-line"
      >
        {TABS.map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={
              'px-3 py-2 text-[13px] transition-colors ' +
              (tab === k
                ? 'border-b-2 border-gold text-goldsoft'
                : 'border-b-2 border-transparent text-muted hover:text-paper')
            }
          >
            {t(`calc.tab.${k}`)}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-1 text-[15px] font-semibold">{t(`calc.tab.${tab}`)}</h2>
        <p className="mb-4 max-w-prose text-[12.5px] leading-relaxed text-muted">
          {t(`calc.${tab}.about`)}
        </p>

        {tab === 'screening' && <Screening />}
        {tab === 'purification' && <Purification />}
        {tab === 'zakat' && <Zakat />}
        {tab === 'distribution' && <Distribution />}
      </div>

      {/*
        Said on the page, not discovered afterwards. A scholar who assumes this
        was filed has been misled by the interface rather than by the record.
      */}
      <p className="mt-4 rounded border border-line px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
        {t('calc.notRecorded')}
      </p>
    </div>
  );
}
