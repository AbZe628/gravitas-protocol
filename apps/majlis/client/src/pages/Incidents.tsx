import { useEffect, useState } from 'react';
import { oversight, type Incident, type IncidentList } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Nothing } from '../components/page.js';
import { ListPage, Row, Rows } from '../components/shapes.js';
import { ErrorText, Loading } from '../components/ui.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { useStillThere } from '../lib/stillThere.js';
import { Field, HEADING } from '../components/field.js';
import { Button } from '../components/Button';

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

const DAY = 86_400_000;

/** Whole days since an instant, floored. The same rule the queue uses. */
function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY));
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
    <span className={clock.overdue ? 'text-note font-medium text-breach' : 'text-note text-muted'}>
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
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reference: '', title: '', report: '' });
  const [error, setError] = useState<string | null>(null);
  const { identity } = useIdentity();

  const load = () =>
    oversight
      .incidents()
      .then((d) => {
        there.arrived();
        setData(d);
      })
      .catch(() => there.lost(setFailed));

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

  /*
   * The two figures a board acts on, beside the title rather than in a column
   * of their own.
   *
   * They used to be two large number tiles in a sidebar, which made this
   * screen a third shape: not a list and not a record. A count that matters
   * belongs where the count of every other list goes.
   */
  const live = (
    <span className="text-ui text-muted">
      <span className="font-mono tabular-nums text-paper">{data.awaitingDetermination}</span>{' '}
      {t('snc.awaiting')}
      {data.overdue > 0 && (
        <>
          <span className="mx-2 opacity-40">·</span>
          <span className="font-mono tabular-nums text-breach">{data.overdue}</span>{' '}
          <span className="text-breach">{t('snc.overdueCount')}</span>
        </>
      )}
    </span>
  );

  return (
    <ListPage
      phase="checked"
      title={t('snc.title')}
      says={t('snc.intro')}
      live={live}
    >

      {/*
        Open to anyone on the board, not only to the institution's own people. A
        scholar who notices something and cannot report it until the right
        person is available is a scholar watching a clock that has not started.
      */}
      {mayDeliberate(identity?.role) && (
        <div className="mb-6">
          {open ? (
            <form onSubmit={report} className="rounded-sheet bg-raised px-6 py-5 shadow-card">
              <Field label={t('snc.reference')} className="mb-3" headingClass={HEADING}>
                {(attrs) => (
                  <input
                    {...attrs}
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-body"
                    placeholder="SNC-2026-001"
                    required
                  />
                )}
              </Field>

              <Field label={t('snc.whatHappened')} className="mb-3" headingClass={HEADING}>
                {(attrs) => (
                  <input
                    {...attrs}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-body"
                    required
                    minLength={3}
                  />
                )}
              </Field>

              {/*
                The hint stays under the box: somebody is writing an account of
                what happened, and the reminder of what to include is useful
                while they write rather than before they start.
              */}
              <Field
                label={t('snc.account')}
                help={t('snc.accountHint')}
                helpClass="order-last mb-3 text-note leading-relaxed text-muted"
                className="mb-0 flex flex-col"
                headingClass={HEADING}
              >
                {(attrs) => (
                  <textarea
                    {...attrs}
                    value={form.report}
                    onChange={(e) => setForm({ ...form, report: e.target.value })}
                    className="mb-1 h-24 w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-body"
                    required
                  />
                )}
              </Field>

              {error && <p className="mb-3 text-ui text-breach">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" className="rounded-xl bg-raised shadow-ring px-3 py-1.5 text-ui text-lapis font-medium">
                  {t('snc.submitReport')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl shadow-ring px-3 py-1.5 text-ui text-muted"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              onClick={() => setOpen(true)}
              className="rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act transition-all hover:bg-lapissoft"
            >
              {t('snc.report')}
            </Button>
          )}
        </div>
      )}

      {incidents.length === 0 ? (
        <Nothing>{t('snc.none')}</Nothing>
      ) : (
        <Rows>
          {incidents.map((i) => (
            <Row
              key={i.id}
              to={`/incidents/${i.id}`}
              phase="checked"
              /*
               * On a list of one kind of thing, the label carries the stage
               * rather than the kind. Repeating "a reported non-compliance"
               * down every row of a page headed exactly that is noise; the
               * stage is what differs from one row to the next.
               */
              kind={t(`snc.stage.${i.stage}`)}
              title={i.title}
              days={daysSince(i.reportedAt)}
              daysLabel={t('needs.daysHere')}
              overdue={Boolean(i.clock?.overdue)}
              /*
               * No act on the row here. The one act a breach is waiting for
               * is worked out on the server, and this screen does not ask for
               * it — only the queue does. Deriving it again on this side
               * would be a second place saying what happens next.
               */
              heldBy={
                i.purification && !i.purification.paidAt
                  ? `${i.purification.amount} ${i.purification.currency} ${t('snc.owed')}`
                  : undefined
              }
            />
          ))}
        </Rows>
      )}
    </ListPage>
  );
}
