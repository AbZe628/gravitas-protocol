import { useState } from 'react';
import { useI18n } from '../lib/i18n.js';
import { PageHead } from '../components/page.js';
import Record from './Record.js';
import Rules from './Rules.js';

/**
 * What we decided, and what stands.
 *
 * Two pages that were always two answers to one question. *What did this board
 * decide* and *what is in force today* are the same enquiry at two distances,
 * and a scholar who wants one usually wants a look at the other — so they were
 * two entries in a navigation of twelve, and a person had to know which of the
 * two words meant which.
 *
 * Neither page is touched. This renders one or the other, and everything each
 * of them did it still does: the year picker, the annual report, the audit
 * export, the retained explanations, the review dates, the rules that carry no
 * review interval and will therefore never be raised by anything.
 *
 * ── the decided one leads ─────────────────────────────────────────────────
 *
 * A board arriving here is more often looking for a decision it made than for
 * the list of what is operative, and the second is reachable in one press. The
 * order is a claim about which question is asked more often, not about which
 * matters more.
 *
 * ── the tab is not remembered ─────────────────────────────────────────────
 *
 * Deliberately. Somebody who left this on the rules tab a month ago and returns
 * looking for last year's ruling would find a screen that is not what they
 * asked for and would have to work out why. A stable starting point is worth
 * more here than a remembered one.
 *
 * ── one heading, and a switch that looks like one ─────────────────────────
 *
 * This used to be a strip of underlined tabs *above* whichever page it showed,
 * and that page then set its own title underneath — so a screen opened with a
 * row of small links and named itself second. The page is named first now, and
 * the two views sit beside the name as a segmented control: a recess with the
 * chosen one raised out of it, which is the same device the language switch
 * uses, so there is nothing new to learn.
 */

type Tab = 'decided' | 'inForce';

const TABS: Tab[] = ['decided', 'inForce'];

export default function WhatStands() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('decided');

  return (
    <div>
      <PageHead
        phase="inforce"
        title={t('stands.title')}
        says={t('stands.lead')}
        act={
        <div
          role="tablist"
          aria-label={t('stands.title')}
          className="flex shrink-0 gap-0.5 self-start rounded-xl bg-paper/[0.045] p-[3px] sm:self-auto"
        >
          {TABS.map((k) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={
                'rounded-lg px-3.5 py-1.5 text-[12.5px] transition-all ' +
                (tab === k
                  ? 'bg-raised font-semibold text-paper shadow-[0_1px_2px_rgba(25,23,19,0.08)]'
                  : 'text-muted hover:text-sand')
              }
            >
              {t(`stands.tab.${k}`)}
            </button>
          ))}
        </div>
        }
      />

      {/*
        The pages themselves, unchanged. Nothing here reimplements either —
        `embedded` only stops each of them setting a second title under the
        first.
      */}
      {tab === 'decided' ? <Record embedded /> : <Rules embedded />}
    </div>
  );
}
