import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { PageHead } from '../components/page.js';
import Distribution from '../components/Distribution.js';
import LatePayment from '../components/LatePayment.js';
import Purification from '../components/Purification.js';
import Recorded from '../components/Recorded.js';
import Screening from '../components/Screening.js';
import Tradability from '../components/Tradability.js';
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
 * ── computing and recording are different acts ────────────────────────────
 *
 * The calculations themselves stay stateless: figures go in, arithmetic comes
 * back, nothing is held. What a board may then do is **note** the result
 * against a period, which is a second and deliberate act with its own button.
 *
 * The distinction is the point. A calculation that recorded itself would put
 * every trial run into the record, and a scholar trying two purification
 * methods to see how far apart they came out would have filed both. Noting one
 * is a decision to say: the board was shown this.
 *
 * And noting is not approving. Whether the method was the right one is a
 * ruling, made in the ordinary way with a vote at the end of it. The sentence
 * saying so comes from the server and is shown before the panel offers to act.
 *
 * ── one narrow list, one open thing ────────────────────────────
 *
 * The seven were a strip of tabs across the top of a column, which is a menu
 * bar over a document. They are a column of their own now, on the work area,
 * with the open calculation beside them — the shape a scholar already knows
 * from mail, so there is nothing to learn before using it. They keep their
 * tab semantics, because a list of things one of which is showing is what a
 * tablist is, whichever way it is laid out.
 */

type Tab = 'screening' | 'purification' | 'zakat' | 'distribution' | 'tradability' | 'late' | 'recorded';

const TABS: Tab[] = ['screening', 'purification', 'zakat', 'distribution', 'tradability', 'late', 'recorded'];

export default function Calculations() {
  const { t } = useI18n();

  /*
   * Which sum, and what it is for, can arrive in the address.
   *
   * A board told on a breach that it must prescribe a purification amount had
   * no way to reach the thing that works one out: the calculator lived on
   * another screen, always opened on screening, and knew nothing about the
   * breach. `?kind=purification&for=<incident>` opens the right sum already
   * knowing what it is for, and the sum can then send its answer back.
   *
   * An unknown kind is ignored rather than reported. A stale link should open
   * the calculations, not an error.
   */
  const [params] = useSearchParams();
  const asked = params.get('kind') as Tab | null;
  const [tab, setTab] = useState<Tab>(asked && TABS.includes(asked) ? asked : 'screening');

  return (
    <div>
      <PageHead
        phase="inforce"
        title={t('calc.title')}
        says={t('calc.intro')}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

      {/*
        One at a time. Four money forms stacked down a page is furniture, and a
        scholar arrives here for one of them.
      */}
      <div
        role="tablist"
        aria-label={t('calc.title')}
        aria-orientation="vertical"
        className="flex w-full shrink-0 flex-row flex-wrap gap-1 lg:w-[244px] lg:flex-col lg:flex-nowrap"
      >
        {TABS.map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={
              'rounded-xl px-4 py-3 text-start text-[13.5px] transition-all ' +
              (tab === k
                ? 'bg-raised font-semibold text-paper shadow-card'
                : 'text-sand hover:bg-raised/60 hover:text-paper')
            }
          >
            {t(`calc.tab.${k}`)}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="g-panel-raised px-7 py-6">
          <h2 className="font-display text-[24px] leading-snug tracking-[-0.018em]">
            {t(`calc.tab.${tab}`)}
          </h2>
          <p className="mb-6 mt-2.5 max-w-[62ch] text-[13px] leading-[1.65] text-muted">
            {t(`calc.${tab}.about`)}
          </p>

          {tab === 'screening' && <Screening />}
          {tab === 'purification' && <Purification />}
          {tab === 'zakat' && <Zakat />}
          {tab === 'distribution' && <Distribution />}
          {tab === 'tradability' && <Tradability />}
          {tab === 'late' && <LatePayment />}
          {tab === 'recorded' && <Recorded />}
        </div>

      {/*
        Said on the page rather than discovered afterwards. A scholar who works
        something out and assumes it was filed has been misled by the interface
        rather than by the record.
      */}
          <p className="mt-4 rounded-card bg-raised/60 px-5 py-4 text-[12.5px] leading-[1.6] text-muted shadow-ring">
            {t('calc.recordingIsSeparate')}
          </p>
        </div>
      </div>
    </div>
  );
}
