import { useState } from 'react';
import { useI18n } from '../lib/i18n.js';
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
 */

type Tab = 'decided' | 'inForce';

const TABS: Tab[] = ['decided', 'inForce'];

export default function WhatStands() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('decided');

  return (
    <div>
      <div
        role="tablist"
        aria-label={t('stands.title')}
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
                ? 'border-b-2 border-lapis text-lapis'
                : 'border-b-2 border-transparent text-muted hover:text-paper')
            }
          >
            {t(`stands.tab.${k}`)}
          </button>
        ))}
      </div>

      {/* The pages themselves, unchanged. Nothing here reimplements either. */}
      {tab === 'decided' ? <Record /> : <Rules />}
    </div>
  );
}
