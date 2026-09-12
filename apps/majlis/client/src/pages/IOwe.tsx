import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Disclosure } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Division, Gaps, Nothing, PageHead } from '../components/page.js';
import { Card, State } from '../components/kit.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useStillThere } from '../lib/stillThere.js';

/**
 * What this institution still owes, and what it still has to do.
 *
 * ── the screen that had no path ───────────────────────────────────────────
 *
 * `GET /disclosure` has assembled this since the incident work was written.
 * Nothing in the application ever called it. Everything a bank most needs to
 * know about itself — how many breaches the board found actual this year,
 * what money is owed to charity and to whom, whether it has been paid, and
 * which rectification steps are still open — was reachable with curl and
 * nowhere else.
 *
 * ── the order is what is outstanding, never what is severe ────────────────
 *
 * Money still owed comes first, then steps still open, then what is settled.
 * Ranking by how bad each one looks would be the software forming a view
 * about a breach it has not read, which it is not entitled to do.
 *
 * ── it names no amount the board did not prescribe ────────────────────────
 *
 * Where the board has determined an event actual but has not yet directed a
 * purification, the amount is absent and the screen says the board has not
 * directed one — rather than showing a zero, which a reader would take for
 * *nothing is owed*. The two are different facts and only one of them is
 * good news.
 *
 * ── the count is the first figure, not the amount ─────────────────────────
 *
 * It is what a regulator asks for first, and an institution reporting an
 * amount without a number of events has told the reader almost nothing.
 */

/** Money as the record holds it: a string, right to the screen. */
function Amount({ amount, currency }: { amount: string; currency: string }) {
  return (
    <span className="font-mono tabular-nums">
      {amount} <span className="text-muted">{currency}</span>
    </span>
  );
}

function Event({ e }: { e: Disclosure['events'][number] }) {
  const { t } = useI18n();

  const owes = e.amount !== null && !e.paid;
  const stepsLeft = e.rectification.length > 0 && !e.rectified;

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {owes ? (
          <State tone="breach">{t('owe.moneyOutstanding')}</State>
        ) : e.rectified ? (
          <State tone="settled">{t('owe.settled')}</State>
        ) : (
          <State tone="attention">{t('owe.stepsOpen')}</State>
        )}
        <span className="font-mono text-[11.5px] text-muted">{e.reference}</span>
      </div>

      {/* What happened, in the board's words. */}
      <div className="font-display text-[17px] leading-snug">{e.nature}</div>

      {/*
        The money. Three states and they are not interchangeable: an amount
        owed, an amount paid, and no amount directed at all.
      */}
      <div className="mt-3 rounded-xl bg-raised px-3.5 py-3 shadow-ring">
        {e.amount === null ? (
          <p className="max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
            {t('owe.noneDirected')}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-[13px] font-semibold">
                {e.paid ? t('owe.paid') : t('owe.owed')}
              </span>
              <span className={e.paid ? 'text-[15px] text-settled' : 'text-[15px] text-breach'}>
                <Amount amount={e.amount} currency={e.currency ?? ''} />
              </span>
            </div>
            {e.destination && (
              <p className="mt-1.5 max-w-[62ch] text-[12px] leading-[1.6] text-muted">
                <span className="font-semibold">{t('owe.to')}</span> {e.destination}
              </p>
            )}
          </>
        )}
      </div>

      {/*
        The steps. This is the part a desk acts on, so it is a list of things
        to do rather than a paragraph about rectification.
      */}
      {e.rectification.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {e.rectified ? t('owe.stepsDone') : t('owe.steps')}
            <span className="ms-2 font-mono tabular-nums opacity-70">
              {e.rectification.length}
            </span>
          </div>
          <ol className="space-y-1.5">
            {e.rectification.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[3px] shrink-0 font-mono text-[11px] text-muted tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={
                    'max-w-[58ch] text-[12.5px] leading-[1.6] ' +
                    (e.rectified ? 'text-muted' : '')
                  }
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/*
        Where the board's own record of this event is. A desk reading its
        obligation has to be able to reach what the board actually wrote.
      */}
      <p className="mt-3 text-[12.5px]">
        <Link to="/incidents" className="text-lapis underline underline-offset-2">
          {t('owe.seeTheRecord')}
        </Link>
      </p>

      {stepsLeft && (
        <p className="mt-2 max-w-[62ch] text-[11.5px] leading-[1.55] text-muted">
          {t('owe.stepsAreYours')}
        </p>
      )}
    </Card>
  );
}

export default function IOwe({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const [d, setD] = useState<Disclosure | null>(null);
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  useEffect(() => {
    oversight
      .disclosure(boardId)
      .then((got) => {
        there.arrived();
        setD(got);
      })
      .catch(() => there.lost(setFailed));
  }, [boardId]);

  if (failed) return <ErrorText />;
  if (!d) return <Loading />;

  const outstanding = d.events.filter((e) => e.amount !== null && !e.paid);
  const open = d.events.filter((e) => !(e.amount !== null && !e.paid) && !e.rectified);
  const done = d.events.filter((e) => !(e.amount !== null && !e.paid) && e.rectified);

  const totals = d.purificationOutstanding;

  return (
    <div>
      <PageHead
        phase="iowe"
        title={t('owe.title')}
        says={t('owe.says')}
        live={
          d.count === 0
            ? t('owe.noneThisYear')
            : `${d.count} ${t('owe.foundActual')} ${d.year}`
        }
      />

      {/*
        The totals, where money is owed. One line per currency, because a
        board and a bank in the Gulf routinely hold both, and adding them
        would invent an exchange rate nobody recorded.
      */}
      {totals.length > 0 && (
        <div className="mb-6 rounded-sheet bg-[#FCF0EE] px-6 py-5 shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-breach">
            {t('owe.stillOwed')}
          </div>
          <ul className="space-y-1">
            {totals.map((row) => (
              <li key={row.currency} className="text-[15px] text-breach">
                {row.amounts.map((a, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-2 opacity-40">+</span>}
                    <Amount amount={a} currency={row.currency} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 max-w-[62ch] text-[12px] leading-[1.6] text-[#7a3a33]">
            {t('owe.totalsNote')}
          </p>
        </div>
      )}

      {d.count === 0 ? (
        <Nothing>{t('owe.nothing')}</Nothing>
      ) : (
        <>
          {outstanding.length > 0 && (
            <Division heading={t('owe.moneyFirst')}>
              <div className="space-y-3">
                {outstanding.map((e) => (
                  <Event key={e.reference} e={e} />
                ))}
              </div>
            </Division>
          )}

          {open.length > 0 && (
            <Division heading={t('owe.stillToDo')}>
              <div className="space-y-3">
                {open.map((e) => (
                  <Event key={e.reference} e={e} />
                ))}
              </div>
            </Division>
          )}

          {done.length > 0 && (
            <Division heading={t('owe.closed')}>
              <div className="space-y-3">
                {done.map((e) => (
                  <Event key={e.reference} e={e} />
                ))}
              </div>
            </Division>
          )}
        </>
      )}

      {/*
        What this page cannot tell you. The year is the one a reader is most
        likely to mistake: this is the year the board *determined* an event
        actual, which is not always the year it happened.
      */}
      <Gaps items={[t('owe.gap.year'), t('owe.gap.determined'), t('owe.gap.notAdvice')]} />
    </div>
  );
}
