import { useState } from 'react';
import { Link } from 'react-router-dom';
import { governance, type SearchHit, type SearchResult } from '../lib/api.js';
import { useIdentity } from '../lib/identity.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, Tag } from '../components/ui.js';

/**
 * Finding what the board decided before.
 *
 * Precedent is the product. Until now the whole of retrieval was a split into
 * open and settled, which works for five matters and fails for two hundred.
 *
 * Every result says which field the words were found in and shows the text, so
 * a scholar can see why it came up and disagree with it. A relevance score
 * nobody can account for is the wrong instrument for a record whose entire
 * claim is that it can be checked.
 */

const STATUSES = ['draft', 'deliberation', 'voting', 'timelock', 'in_force', 'rejected', 'lapsed'] as const;

export default function Search() {
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [mine, setMine] = useState(false);

  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const empty = !q.trim() && !status && !direction && !mine;

  async function run() {
    if (busy || empty) return;
    setBusy(true);
    setFailed(false);
    try {
      setResult(
        await governance.search({
          q: q.trim() || undefined,
          status: status ? [status] : undefined,
          direction: direction || undefined,
          member: mine ? identity?.scholarId : undefined,
        }),
      );
    } catch {
      setFailed(true);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setQ('');
    setStatus('');
    setDirection('');
    setMine(false);
    setResult(null);
    setFailed(false);
  }

  const select = 'rounded border border-line bg-transparent px-2 py-1.5 text-[13px] outline-none';

  return (
    <div>
      <h1 className="mb-2 text-[19px] font-semibold">{t('search.title')}</h1>
      <p className="mb-5 max-w-reading text-[13.5px] leading-relaxed text-muted">{t('search.lead')}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="mb-5 space-y-3"
      >
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.title')}
            className="min-w-[14rem] flex-1 rounded border border-line bg-transparent p-2 text-[14px] outline-none"
          />
          <button
            type="submit"
            disabled={busy || empty}
            className="rounded border border-line px-4 py-2 text-[13px] hover:bg-surface/60 disabled:opacity-40"
          >
            {t('search.go')}
          </button>
          {(result || q || status || direction || mine) && (
            <button type="button" onClick={clear} className="px-2 text-[13px] text-muted hover:text-paper">
              {t('search.clear')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] uppercase tracking-wide text-muted">{t('search.filters')}</span>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className={select} aria-label={t('search.anyStatus')}>
            <option value="">{t('search.anyStatus')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`matter.status.${s}`)}
              </option>
            ))}
          </select>

          <select value={direction} onChange={(e) => setDirection(e.target.value)} className={select} aria-label={t('search.anyDirection')}>
            <option value="">{t('search.anyDirection')}</option>
            <option value="permit">{t('matter.direction.permit')}</option>
            <option value="restrict">{t('matter.direction.restrict')}</option>
          </select>

          {identity && identity.role !== 'observer' && (
            <label className="flex items-center gap-1.5 text-[13px] text-muted">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
              {t('search.mine')}
            </label>
          )}
        </div>
      </form>

      {!result && !failed && (
        <p className="text-[13px] leading-relaxed text-muted">{t('search.emptyQuery')}</p>
      )}

      {failed && <p className="text-[13px] text-amber-200">{t('common.loading')}</p>}

      {result && (
        <>
          <p className="mb-3 text-[12.5px] text-muted tabular-nums">
            {result.count} {t('search.count')}
          </p>
          {result.hits.length === 0 ? (
            <p className="text-[13px] text-muted">{t('search.none')}</p>
          ) : (
            <ul className="space-y-3">
              {result.hits.map((h) => (
                <Hit key={h.matterId} hit={h} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Hit({ hit }: { hit: SearchHit }) {
  const { t } = useI18n();
  return (
    <li className="rounded-lg border border-line p-3.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
        <Tag tone={hit.direction === 'restrict' ? 'warn' : 'gold'}>
          {t(`matter.direction.${hit.direction}`)}
        </Tag>
        <Tag>{t(`matter.status.${hit.status}`)}</Tag>
        <span className="text-muted">
          <DateText iso={hit.inForceAt ?? hit.openedAt} />
        </span>
      </div>

      <Link to={`/matters/${hit.matterId}`} className="text-[15px] font-medium leading-snug text-paper hover:text-goldsoft">
        {hit.title}
      </Link>

      {hit.matches.length > 0 && (
        <ul className="mt-2.5 space-y-1.5 border-t border-line pt-2.5">
          {hit.matches.map((m, i) => (
            <li key={i} className="text-[12.5px] leading-relaxed">
              <span className="text-goldsoft">{t(`search.field.${m.field}`)}</span>
              {m.by && <span className="text-muted"> · {m.by}</span>}
              <div className="text-muted">{m.snippet}</div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
