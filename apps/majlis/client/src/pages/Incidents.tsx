import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Incident, type IncidentList } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Tag } from '../components/ui.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';

/**
 * Reported non-compliance.
 *
 * A separate surface from matters because it is a separate thing: a matter is a
 * proposal to change a rule, this is an account of something that already
 * happened. The difference that shows here is the clock — from the moment the
 * board finds an event actual, thirty days run that the institution is judged
 * on, and nothing about a rule change has that property.
 *
 * The order is by what is closing, which is a fact, and never by severity,
 * which would be the software forming a view about a breach it has not read.
 */

function stageTone(i: Incident): 'warn' | 'gold' | 'ok' | undefined {
  if (i.stage === 'closed' || i.stage === 'not_actual') return 'ok';
  if (i.clock?.overdue) return 'warn';
  if (i.stage === 'reported') return 'gold';
  return undefined;
}

/** Something reported and not yet determined has no clock and is still first. */
function order(a: Incident, b: Incident): number {
  const rank = (i: Incident) => {
    if (i.clock?.overdue) return 0;
    if (i.stage === 'reported') return 1;
    if (i.clock) return 2;
    return 3;
  };
  const byRank = rank(a) - rank(b);
  if (byRank !== 0) return byRank;
  const left = a.clock?.daysRemaining ?? Number.POSITIVE_INFINITY;
  const right = b.clock?.daysRemaining ?? Number.POSITIVE_INFINITY;
  return left - right;
}

export function ClockLine({ incident }: { incident: Incident }) {
  const { t } = useI18n();
  const clock = incident.clock;
  if (!clock) return null;

  const days = Math.round(Math.abs(clock.daysRemaining));
  return (
    <span className={clock.overdue ? 'text-[12px] font-medium text-warn' : 'text-[12px] text-muted'}>
      {clock.overdue
        ? `${t('snc.overdueBy')} ${days} ${t('attention.days')}`
        : `${days} ${t('snc.daysLeftOf30')}`}
    </span>
  );
}

export default function Incidents() {
  const { t } = useI18n();
  const [data, setData] = useState<IncidentList | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reference: '', title: '', report: '' });
  const [error, setError] = useState<string | null>(null);
  const { identity } = useIdentity();

  const load = () =>
    oversight
      .incidents()
      .then(setData)
      .catch(() => setFailed(true));

  useEffect(() => {
    void load();
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const incidents = Array.isArray(data.incidents) ? [...data.incidents].sort(order) : [];

  async function report(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await oversight.report({ boardId: 'demo-board', ...form });
      setForm({ reference: '', title: '', report: '' });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-[19px] font-semibold">{t('snc.title')}</h1>
      <p className="mb-5 text-[13px] leading-relaxed text-muted">{t('snc.intro')}</p>

      {incidents.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          <span>
            <span className="text-muted">{t('snc.awaiting')} </span>
            <span className="font-medium tabular-nums">{data.awaitingDetermination}</span>
          </span>
          {data.overdue > 0 && (
            <span className="text-warn">
              {data.overdue} {t('snc.overdueCount')}
            </span>
          )}
        </div>
      )}

      {/*
        Open to anyone on the board, not only to the institution's own people. A
        scholar who notices something and cannot report it until the right
        person is available is a scholar watching a clock that has not started.
      */}
      {mayDeliberate(identity?.role) && (
        <div className="mb-6">
          {open ? (
            <form onSubmit={report} className="rounded-lg border border-line bg-surface p-4">
              <label className="mb-1 block text-[12px] text-muted">{t('snc.reference')}</label>
              <input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="mb-3 w-full rounded border border-line bg-transparent px-3 py-2 text-[14px]"
                placeholder="SNC-2026-001"
                required
              />
              <label className="mb-1 block text-[12px] text-muted">{t('snc.whatHappened')}</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mb-3 w-full rounded border border-line bg-transparent px-3 py-2 text-[14px]"
                required
                minLength={3}
              />
              <label className="mb-1 block text-[12px] text-muted">{t('snc.account')}</label>
              <textarea
                value={form.report}
                onChange={(e) => setForm({ ...form, report: e.target.value })}
                className="mb-1 h-24 w-full rounded border border-line bg-transparent px-3 py-2 text-[14px]"
                required
              />
              <p className="mb-3 text-[11px] leading-relaxed text-muted">{t('snc.accountHint')}</p>

              {error && <p className="mb-3 text-[13px] text-warn">{error}</p>}

              <div className="flex gap-2">
                <button type="submit" className="rounded border border-gold/60 px-3 py-1.5 text-[13px] text-goldsoft">
                  {t('snc.submitReport')}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border border-line px-3 py-1.5 text-[13px] text-muted"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="rounded border border-line px-3 py-2 text-[13px] text-muted hover:border-muted"
            >
              {t('snc.report')}
            </button>
          )}
        </div>
      )}

      {incidents.length === 0 ? (
        <p className="text-[14px] text-muted">{t('snc.none')}</p>
      ) : (
        <ul className="space-y-3">
          {incidents.map((i) => (
            <li key={i.id}>
              <Link to={`/incidents/${i.id}`} className="block">
                <Card accent={Boolean(i.clock?.overdue)}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Tag tone={stageTone(i)}>{t(`snc.stage.${i.stage}`)}</Tag>
                    <ClockLine incident={i} />
                  </div>
                  <div className="text-[15px] font-medium leading-snug">{i.title}</div>
                  <div className="mt-2 text-[12px] text-muted">
                    <span className="font-mono">{i.reference}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    {t('snc.reported')} <DateText iso={i.reportedAt} />
                    {i.purification && !i.purification.paidAt && (
                      <>
                        <span className="mx-1.5 opacity-40">·</span>
                        <span className="text-goldsoft">
                          {i.purification.amount} {i.purification.currency} {t('snc.owed')}
                        </span>
                      </>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
