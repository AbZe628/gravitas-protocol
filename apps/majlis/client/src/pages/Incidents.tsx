import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Incident, type IncidentList } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Division, Nothing, PageHead } from '../components/page.js';
import { DateText, ErrorText, Loading, Tag } from '../components/ui.js';
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
    <span className={clock.overdue ? 'text-[12px] font-medium text-breach' : 'text-[12px] text-muted'}>
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
      <PageHead
        phase="checked"
        title={t('snc.title')}
        says={t('snc.intro')}
      />

      {/*
        Open to anyone on the board, not only to the institution's own people. A
        scholar who notices something and cannot report it until the right
        person is available is a scholar watching a clock that has not started.
      */}
      {mayDeliberate(identity?.role) && (
        <div className="mb-6">
          {open ? (
            <form onSubmit={report} className="rounded-sheet bg-raised px-6 py-5 shadow-card">
              <label className="mb-1 block text-[12px] text-muted">{t('snc.reference')}</label>
              <input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="mb-3 w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-[14px]"
                placeholder="SNC-2026-001"
                required
              />
              <label className="mb-1 block text-[12px] text-muted">{t('snc.whatHappened')}</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mb-3 w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-[14px]"
                required
                minLength={3}
              />
              <label className="mb-1 block text-[12px] text-muted">{t('snc.account')}</label>
              <textarea
                value={form.report}
                onChange={(e) => setForm({ ...form, report: e.target.value })}
                className="mb-1 h-24 w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-[14px]"
                required
              />
              <p className="mb-3 text-[11px] leading-relaxed text-muted">{t('snc.accountHint')}</p>

              {error && <p className="mb-3 text-[13px] text-breach">{error}</p>}

              <div className="flex gap-2">
                <button type="submit" className="rounded-xl bg-raised shadow-ring px-3 py-1.5 text-[13px] text-lapis font-medium">
                  {t('snc.submitReport')}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl shadow-ring px-3 py-1.5 text-[13px] text-muted"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl bg-lapis px-5 py-2.5 text-[13px] font-semibold text-white shadow-act transition-all hover:bg-lapissoft"
            >
              {t('snc.report')}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
      <Division heading={t('snc.openHere')}>
      {incidents.length === 0 ? (
        <Nothing>{t('snc.none')}</Nothing>
      ) : (
        <ul className="space-y-2">
          {incidents.map((i) => (
            <li key={i.id}>
              <Link
                to={`/incidents/${i.id}`}
                className={
                  'block rounded-sheet px-6 py-5 transition-all hover:-translate-y-px hover:shadow-card ' +
                  (i.clock?.overdue
                    ? 'bg-raised shadow-[0_0_0_0.5px_rgba(154,56,48,0.2),0_1px_2px_rgba(25,23,19,0.045),0_12px_24px_-14px_rgba(25,23,19,0.16)]'
                    : 'bg-raised/75 shadow-ring')
                }
              >
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                  <div className="min-w-0 sm:order-first">
                    <div className="font-display text-[19px] leading-snug tracking-[-0.014em]">
                      {i.title}
                    </div>
                  </div>
                  <div className="order-first flex shrink-0 flex-wrap items-center gap-2.5 sm:order-none">
                    <Tag tone={stageTone(i)}>{t(`snc.stage.${i.stage}`)}</Tag>
                    <ClockLine incident={i} />
                  </div>
                </div>
                  <div className="mt-2.5 text-[12px] text-muted">
                    <span className="font-mono">{i.reference}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    {t('snc.reported')} <DateText iso={i.reportedAt} />
                    {i.purification && !i.purification.paidAt && (
                      <>
                        <span className="mx-1.5 opacity-40">·</span>
                        <span className="text-lapis">
                          {i.purification.amount} {i.purification.currency} {t('snc.owed')}
                        </span>
                      </>
                    )}
                  </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </Division>
        </div>

        {/*
          The two figures a board acts on. Waiting on it, and past the thirty
          days that run from finding an event actual — which is the only
          deadline in this application the board does not set for itself.
        */}
        {incidents.length > 0 && (
          <aside className="w-full shrink-0 space-y-4 lg:w-[306px]">
            <div className="rounded-sheet bg-raised/60 px-6 py-5 shadow-ring">
              <div className="font-display text-[40px] leading-[0.92] tabular-nums tracking-[-0.028em] text-paper">
                {data.awaitingDetermination}
              </div>
              <p className="mt-3.5 text-[13px] leading-[1.6] text-sand">{t('snc.awaiting')}</p>
            </div>

            {data.overdue > 0 && (
              <div className="rounded-sheet bg-[#FCF0EE] px-6 py-5 shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]">
                <div className="font-display text-[40px] leading-[0.92] tabular-nums tracking-[-0.028em] text-breach">
                  {data.overdue}
                </div>
                <p className="mt-3.5 text-[13px] leading-[1.6] text-breach">{t('snc.overdueCount')}</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
