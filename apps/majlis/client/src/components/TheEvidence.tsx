import { Link } from 'react-router-dom';
import type { Chain, ChainLink } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * What this ruling asks, and what was found about each of it.
 *
 * ── the chain was cut here ────────────────────────────────────────────────
 *
 * The line this whole application is for: the board rules, the ruling sets a
 * condition, the condition is something the institution has to do, its own
 * review looks at whether it did, and the board reads what was found. Every
 * part existed and none of it joined up — rulings on one screen, the register
 * on a second, examinations on a third, which is why the examinations read as
 * bolted on.
 *
 * Open the pool ruling before this. It answers six questions — what was
 * decided, how it is measured, whether it moves, when it is checked, what
 * happens if it fails, who is told. All mechanism, all correct, and not one
 * word about the fact that it **did** fail: three transfers executed at 50.4%
 * in June, found by an examination, sitting in the record, and invisible on
 * the page for the rule they breached.
 *
 * ── the silence is the point ──────────────────────────────────────────────
 *
 * The valuable half is what nobody has looked at. A board reading *six of
 * these eight have never been examined* is being told something no summary
 * ever tells it, so a condition nobody examined is a row with nothing in it
 * rather than a row that is not drawn.
 *
 * ── and it reports; it does not conclude ──────────────────────────────────
 *
 * No pass, no score, no traffic light. Exceptions are counted and the
 * examiner's own words are carried. Whether three exceptions in seventy-eight
 * make an arrangement impermissible is a ruling, and is raised as a matter
 * like any other.
 */
/*
 * Read once, on the page, and passed in.
 *
 * The panel beside the ruling needs the same answer: it said *this stands,
 * nothing is waiting on the board* over three recorded exceptions, and it
 * cannot stop saying that from a reading this component keeps to itself.
 */
export default function TheEvidence({ chain }: { chain: Chain | null }) {
  const { t } = useI18n();

  if (!chain || chain.links.length === 0) return null;

  return (
    <section className="mt-6 border-t border-line pt-5" aria-label={t('evid.title')}>
      <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
        {t('evid.title')}
      </div>
      <p className="mb-3 max-w-[62ch] text-ui leading-relaxed text-muted">{t('evid.lead')}</p>

      {/*
        The two figures a board actually asks for, before the list. How much of
        its own ruling has never been looked at, and how much was found.
      */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-ui">
        <span className={chain.neverLooked > 0 ? 'text-goldink' : 'text-muted'}>
          {t('evid.neverLooked', { n: chain.neverLooked, of: chain.links.length })}
        </span>
        <span className={chain.exceptions > 0 ? 'text-breach' : 'text-muted'}>
          {t('evid.exceptionsFound', { n: chain.exceptions })}
        </span>
        <span className="text-muted">{t('evid.examinations', { n: chain.examinations })}</span>
      </div>

      <ul className="space-y-2.5">
        {chain.links.map((l) => (
          <Asks key={l.against} link={l} />
        ))}
      </ul>
    </section>
  );
}

function Asks({ link }: { link: ChainLink }) {
  const { t } = useI18n();
  const found = link.lastLooked;

  return (
    <li className="rounded-card bg-raised/60 px-4 py-3 shadow-ring">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label font-bold uppercase tracking-caps text-muted">
          {t(`evid.kind.${link.kind}`)}
        </span>
        {/*
          What the institution has to produce. The shape's own answer, and
          absent on an operative term rather than invented for one: what shows
          a figure is the figure, which question four already answers above.
        */}
        {link.shownBy && (
          <span className="text-note text-muted">
            {t('evid.shownBy')} {t(`evid.shown.${link.shownBy}`)}
          </span>
        )}
      </div>

      {/* The board's own words for what is asked. Never the key it is filed under. */}
      <p className="max-w-[62ch] text-ui leading-relaxed text-paper">{link.asks}</p>
      {link.why && (
        <p className="mt-1 max-w-[62ch] text-note leading-relaxed text-muted">{link.why}</p>
      )}

      {found === null ? (
        /*
          Nobody has looked. Said in place, in the row, rather than by the row
          being absent — a condition that quietly is not drawn reads as one
          that is fine.
        */
        <p className="mt-2 text-ui text-goldink">{t('evid.never')}</p>
      ) : (
        <div className="mt-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {found.held === 'exceptions' ? (
              <span className="text-ui font-semibold text-breach">
                <span className="font-mono tabular-nums">{found.exceptions}</span>{' '}
                {/*
                  *1 exceptions*, on the first examination that found exactly
                  one. The application says *chased once* and *one mismatch*
                  everywhere else; this was the one count with no singular.
                */}
                {t(found.exceptions === 1 ? 'exam.exception' : 'exam.exceptions')}
              </span>
            ) : (
              <span className="text-ui text-muted">{t('evid.held')}</span>
            )}
            <span className="text-note text-muted">
              {t('evid.lastLooked')} {found.from.slice(0, 10)} — {found.to.slice(0, 10)}
            </span>
            {link.timesLooked > 1 && (
              <span className="text-note text-muted">
                {t('evid.timesLooked', { n: link.timesLooked })}
              </span>
            )}
          </div>

          {/* The examiner's words, never summarised and never rewritten here. */}
          {found.note && (
            <p className="mt-1 max-w-[62ch] text-ui leading-relaxed text-muted">{found.note}</p>
          )}

          {/*
            Evidence about the terms that were replaced is evidence about a
            ruling that is gone. A clean finding against terms that have moved
            says so rather than reading as reassurance about today's.
          */}
          {!found.againstTheseTerms && (
            <p className="mt-1 max-w-[62ch] text-note leading-relaxed text-goldink">
              {t('evid.olderTerms')}
            </p>
          )}

          {/*
            The period is the date a board means, and it is already above.

            The day it was typed up sat here beside the link with no label, so
            the row carried two dates and said what neither of them was.
          */}
          <p className="mt-1 text-note">
            <Link
              className="text-lapis underline decoration-line underline-offset-4"
              to="/examinations"
            >
              {t('evid.open')}
            </Link>
          </p>
        </div>
      )}
    </li>
  );
}
