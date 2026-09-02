import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { governance, type Related } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, Tag } from './ui.js';

/**
 * What the board has already decided that bears on this.
 *
 * A scholar opening a matter should be able to see, without going looking, that
 * the board argued from the same standard two years ago and what it concluded.
 *
 * Every relation shown here is a fact in the record — a shared citation, a
 * declared interaction, the same operative term — and each says which. Offering
 * a scholar a resemblance as a precedent would invite them to treat it as one,
 * and a precedent is a serious claim.
 */
export default function Precedent({ matterId }: { matterId: string }) {
  const { t } = useI18n();
  const [related, setRelated] = useState<Related[] | null>(null);

  useEffect(() => {
    let live = true;
    governance
      .related(matterId)
      .then((r) => live && setRelated(Array.isArray(r) ? r : []))
      // Precedent is the least important thing on this page and must never be
      // the reason a member cannot read the matter.
      .catch(() => live && setRelated([]));
    return () => {
      live = false;
    };
  }, [matterId]);

  if (related === null) return null;

  if (related.length === 0) {
    return <p className="text-[13px] text-muted">{t('related.none')}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-muted">{t('related.help')}</p>

      <ul className="space-y-2">
        {related.map((r) => (
          <li key={r.matterId} className="rounded-lg border border-line p-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
              <Tag tone={r.direction === 'restrict' ? 'warn' : 'gold'}>
                {t(`matter.direction.${r.direction}`)}
              </Tag>
              <Tag>{t(`matter.status.${r.status}`)}</Tag>
              <span className="text-muted">
                <DateText iso={r.inForceAt ?? r.openedAt} />
              </span>
            </div>

            <Link
              to={`/matters/${r.matterId}`}
              className="text-[14px] font-medium leading-snug text-paper hover:text-goldsoft"
            >
              {r.title}
            </Link>

            {/* The specific thing shared, shown rather than summarised. */}
            <ul className="mt-2 space-y-1">
              {r.relations.map((rel, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-muted">
                  <span className="text-goldsoft">{t(`related.${rel.kind}`)}</span>
                  <span className="mx-1.5 opacity-40">·</span>
                  <span className="font-mono text-[11.5px]">{rel.shared}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
