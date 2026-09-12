import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { oversight, Refused, type Computation } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Division, Gaps, Nothing, PageHead } from '../components/page.js';
import { Steps } from '../components/calc.js';
import { State } from '../components/kit.js';
import TellTheBank from '../components/TellTheBank.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useStillThere } from '../lib/stillThere.js';

/**
 * One recorded calculation, at an address of its own.
 *
 * ── the question this answers ─────────────────────────────────────────────
 *
 * *Where does the calculation get written down, and who is it sent to, and
 * why.* The first two thirds had answers and the last third did not: a figure
 * was recorded against a period, a notice went to the bank saying so — and
 * the notice carried the amount, the method and the source in its body with
 * no working and nothing to open. The desk that has to act on the figure
 * could read what it was and never how it was arrived at.
 *
 * `GET /computations/:id` has returned the whole of it, steps included, since
 * the computations work was written. Nothing in the application called it.
 *
 * ── why an address rather than a panel ────────────────────────────────────
 *
 * Because it is the thing that gets referred to. An auditor asking why the
 * zakat figure changed between two quarters, a desk reconciling what it was
 * told, a board member coming back to a figure a colleague mentioned — each
 * of them needs to arrive at exactly one calculation, not at a list to scroll
 * and a disclosure to open.
 *
 * ── the state is the first thing, not a footnote ──────────────────────────
 *
 * A figure that has been superseded or withdrawn is still at its address and
 * still readable, because the record is append-only and a link that stopped
 * working would be the record editing itself. But somebody arriving from an
 * old notice has to be told before they read the number, not after — so the
 * standing sits above the amount and the replacement is a link.
 */

function day(iso: string): string {
  return iso.slice(0, 10);
}

export default function Figure() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();

  const [c, setC] = useState<Computation | null>(null);
  const [means, setMeans] = useState('');
  /** Absent because there is no such calculation, which is not a failure. */
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  function load() {
    if (!id) return;
    oversight
      .computation(id)
      .then((got) => {
        there.arrived();
        setC(got.computation);
        setMeans(got.whatRecordingMeans);
      })
      .catch((e) => {
        /*
         * Two different things, and they must not read the same. A wrong
         * address is the reader's mistake and is recoverable by going back;
         * a connection that failed is ours and is recoverable by trying
         * again. A single "could not load" for both sends somebody hunting
         * for a typo in a link that was right.
         *
         * This needed a fix under it: `get` threw a bare Error carrying only
         * the string "404 Not Found", so no screen anywhere could tell the
         * two apart. It now refuses the way a write does, with the status on
         * it.
         */
        if (e instanceof Refused && e.status === 404) {
          setMissing(true);
          return;
        }
        there.lost(setFailed);
      });
  }

  useEffect(load, [id]);

  if (missing) {
    return (
      <div>
        <PageHead phase="inforce" title={t('figure.noneTitle')} says={t('figure.noneSays')} />
        <Nothing>{t('figure.none')}</Nothing>
        <p className="mt-4 text-[12.5px]">
          <Link to="/calculations" className="text-lapis underline underline-offset-2">
            {t('figure.allOfThem')}
          </Link>
        </p>
      </div>
    );
  }

  if (failed) return <ErrorText />;
  if (!c) return <Loading />;

  const withdrawn = c.withdrawnAt !== null;

  return (
    <div>
      <PageHead
        phase="inforce"
        /*
         * No tail. It carried the first eight characters of the identifier,
         * which rendered as `computat` in the mono face — a reader learns
         * nothing from it and it looks like something truncated by mistake.
         * The crumb is for where you are; which calculation this is, is the
         * heading's job and the heading does it.
         */
        title={c.headline}
        says={t('figure.says')}
        live={
          withdrawn ? (
            <State tone="breach">{t('recorded.withdrawn')}</State>
          ) : (
            <State tone="settled">{t('recorded.standing')}</State>
          )
        }
      />

      {/*
        Somebody arriving from an old notice is told before they read the
        number, not after. A withdrawn figure that looked ordinary until the
        bottom of the page is a figure somebody acts on.
      */}
      {withdrawn && (
        <div className="mb-6 rounded-sheet bg-[#FCF0EE] px-6 py-5 shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-breach">
            {t('recorded.withdrawn')}
          </div>
          <p className="max-w-[62ch] text-[13px] leading-[1.65] text-[#7a3a33]">
            {t('recorded.withdrawnBy')} {c.withdrawnBy} — {c.withdrawalReason}
          </p>
        </div>
      )}

      <Division heading={t('figure.theFigure')}>
        <div className="rounded-sheet bg-raised px-6 py-5 shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="text-[13px] text-muted">
              {day(c.periodFrom)} — {day(c.periodTo)}
            </span>
            {/*
              The amount as the record holds it, and nothing appended.
              Adding the currency beside it printed `AED 2,401,431.75 AED`:
              the server's amount is a display string that already carries
              the unit where there is one, and carries a percentage where
              there is not. A screen that adds a currency to it is guessing
              about a figure it did not compute.
            */}
            <span className="font-mono text-[26px] tabular-nums">{c.amount}</span>
          </div>
          <p className="mt-3 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
            {t('recorded.by')} {c.recordedBy} · {day(c.recordedAt)} · {c.source}
          </p>
        </div>
      </Division>

      {/*
        The method the board stated, then the arithmetic. Never the other way
        round: a reader who meets the sums first is reading numbers with no
        idea which of two bases produced them.
      */}
      <Division heading={t('figure.method')}>
        <p className="max-w-[62ch] text-[13.5px] leading-[1.65]">{c.methodStated}</p>
      </Division>

      <Division heading={t('figure.working')} note={t('figure.working.note')}>
        <Steps steps={c.steps} />
      </Division>

      {/*
        What this calculation did not answer, carried from the server so
        nothing on this page can soften it.
      */}
      <Division heading={t('figure.doesNotSay')}>
        <p className="max-w-[62ch] text-[13px] leading-[1.65] text-sand">{c.note}</p>
      </Division>

      {/* Where it came from and what it replaced, as links rather than ids. */}
      {(c.supersedes || c.assetId) && (
        <Division heading={t('figure.related')}>
          <ul className="space-y-2 text-[12.5px]">
            {c.supersedes && (
              <li>
                <Link
                  to={`/figures/${c.supersedes}`}
                  className="text-lapis underline underline-offset-2"
                >
                  {t('figure.replaces')}
                </Link>
              </li>
            )}
            {c.assetId && (
              <li>
                <Link
                  to={`/register/${c.assetId}`}
                  className="text-lapis underline underline-offset-2"
                >
                  {t('figure.theHolding')}
                </Link>
              </li>
            )}
          </ul>
        </Division>
      )}

      {/*
        And then you tell the bank — from here as well as from the list,
        because this is where somebody arrives when they have read the whole
        thing and is the moment they decide the desk should have it.
      */}
      {!withdrawn && (
        <Division heading={t('figure.tell')}>
          <TellTheBank kind="figure" id={c.id} />
        </Division>
      )}

      <div className="mt-6 rounded-card bg-raised px-5 py-4 text-[12.5px] leading-[1.65] text-muted shadow-ring">
        {means}
      </div>

      <Gaps items={[t('figure.gap.notPaid'), t('figure.gap.notAgreed')]} />
    </div>
  );
}
