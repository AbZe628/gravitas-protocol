import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { governance, type Attention as AttentionData, type AttentionItem } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, Tag } from './ui.js';

/**
 * What is waiting for this member.
 *
 * The point of the panel is that a deadline should not pass because nobody was
 * looking. So the time left is the loudest thing on each row, and something
 * already past its deadline is stated as past rather than shown as a negative
 * number the reader has to interpret.
 *
 * If the panel cannot load, it says nothing at all rather than "0 outstanding".
 * An empty list and a failed request look identical to a reader and mean
 * opposite things, and the one that is wrong to imply is "you have nothing to
 * do".
 */

function remaining(item: AttentionItem, t: (k: string) => string): string | null {
  if (item.hoursRemaining === null) return null;
  if (item.overdue) return t('attention.overdue');

  const hours = item.hoursRemaining;
  if (hours < 48) return `${Math.round(hours)} ${t('attention.hours')} ${t('attention.remaining')}`;
  return `${Math.round(hours / 24)} ${t('attention.days')} ${t('attention.remaining')}`;
}

function toneFor(item: AttentionItem): 'warn' | 'gold' | undefined {
  if (item.overdue) return 'warn';
  if (item.hoursRemaining !== null && item.hoursRemaining < 24) return 'warn';
  if (item.kind === 'ready_to_take_effect') return 'gold';
  return undefined;
}

export default function Attention() {
  const { t } = useI18n();
  const [data, setData] = useState<AttentionData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    governance
      .attention()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  // Say nothing rather than imply there is nothing.
  if (failed || !data) return null;
  if (data.items.length === 0) {
    return (
      <div className="mb-5 rounded-lg border border-line bg-surface/60 px-4 py-3 text-[13px] text-muted">
        {t('attention.none')}
      </div>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-baseline gap-2 text-[15px] font-semibold">
        {t('attention.title')}
        <span className="text-[12px] font-normal text-muted">
          {data.outstanding}
          {data.overdue > 0 ? ` · ${data.overdue} ${t('attention.overdue').toLowerCase()}` : ''}
        </span>
      </h2>

      <ul className="space-y-2">
        {data.items.map((item) => {
          const left = remaining(item, t);
          return (
            <li key={item.matterId}>
              <Link to={`/matters/${item.matterId}`} className="block">
                <Card accent={item.overdue}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Tag tone={toneFor(item)}>
                      {t(item.kind === 'overdue' ? 'attention.overdueKind' : `attention.${item.kind}`)}
                    </Tag>
                    {left && (
                      <span
                        className={
                          item.overdue
                            ? 'text-[12px] font-medium text-amber-300'
                            : 'text-[12px] text-muted'
                        }
                      >
                        {left}
                      </span>
                    )}
                  </div>
                  <div className="text-[14px] font-medium leading-snug">{item.title}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.note}</p>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
