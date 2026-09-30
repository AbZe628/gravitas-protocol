import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type RestedOn, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText } from './ui.js';

/**
 * What this ruling replaced, what replaced it, and what rested on it.
 *
 * ── the page promised this and had nothing behind it ──────────────────────
 *
 * *In force today* says, in its own words, **the chain of what replaced what
 * is drawn, not implied** — and nothing in the application had ever replaced
 * anything. No route wrote a rule; `supersededBy` was read in five services
 * and set by none; two seeded rulings claimed to be version 3 and version 2
 * with no predecessor in existence. Found by listing the rules.
 *
 * ── and what rested on it ─────────────────────────────────────────────────
 *
 * A board that amends a standard has changed what the institution is measured
 * by. Every examination run under the old terms tested something that is no
 * longer the test; every promise still owed under it was given about a rule
 * that has moved. None of that is wrong by itself, and nothing here says it
 * is: this lists what is affected and puts it in front of the people whose
 * judgement that is.
 *
 * Read only where it means something — a ruling that replaced nothing and was
 * replaced by nothing has no chain, and a heading over an empty list is a
 * screen asking to be scrolled past.
 */
export default function TheChain({ rule }: { rule: Rule }) {
  const { t } = useI18n();
  const [rested, setRested] = useState<RestedOn | null>(null);
  /**
   * The titles at each end of the chain.
   *
   * It drew the ids — *Replaced by rule-matter-20260930173714-sex2hi* — which
   * is the key the record files a ruling under, printed where its name
   * belongs. The same fault as a scholar drawn by their key, on the one
   * sentence that tells a reader where the standard went. Found by replacing
   * a ruling and reading the page.
   */
  const [named, setNamed] = useState<Record<string, string>>({});

  const replaced = Boolean(rule.supersededBy);

  useEffect(() => {
    const ends = [rule.supersedes, rule.supersededBy].filter((x): x is string => Boolean(x));
    if (ends.length === 0) return;
    let alive = true;
    void Promise.all(
      ends.map((id) =>
        oversight
          .ruleNamed(id)
          // The id, where the ruling cannot be read. A reader sees what the
          // record holds rather than a gap where a name should be.
          .then((r) => [id, r?.title || id] as const)
          .catch(() => [id, id] as const),
      ),
    ).then((pairs) => alive && setNamed(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [rule.id, rule.supersedes, rule.supersededBy]);

  useEffect(() => {
    if (!replaced) return;
    let alive = true;
    // A failure takes nothing off the page: the chain renders without the
    // list rather than the ruling refusing to load.
    oversight
      .restedOn(rule.id)
      .then((r) => alive && setRested(Array.isArray(r?.items) ? r : null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [rule.id, replaced]);

  if (!rule.supersedes && !rule.supersededBy) return null;

  const items = rested?.items ?? [];

  return (
    <section className="mt-6 border-t border-line pt-5" aria-label={t('chain.title')}>
      <div className="mb-2 text-label font-bold uppercase tracking-caps text-muted">{t('chain.title')}</div>

      <ul className="space-y-1.5 text-ui leading-relaxed">
        {rule.supersedes && (
          <li>
            {t('chain.replaces')}{' '}
            <Link className="text-lapis underline decoration-line underline-offset-4" to={`/rules/${rule.supersedes}`}>
              {named[rule.supersedes] ?? rule.supersedes}
            </Link>
          </li>
        )}
        {rule.supersededBy && (
          <li className="text-breach">
            {t('chain.replacedBy')}{' '}
            <Link
              className="underline decoration-line underline-offset-4"
              to={`/rules/${rule.supersededBy}`}
            >
              {named[rule.supersededBy] ?? rule.supersededBy}
            </Link>
          </li>
        )}
      </ul>

      {replaced && (
        <div className="mt-4">
          <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
            {t('chain.restedOn')}
          </div>
          {items.length === 0 ? (
            <p className="max-w-[62ch] text-ui leading-relaxed text-muted">{t('chain.nothingRested')}</p>
          ) : (
            <>
              <p className="mb-2 max-w-[62ch] text-ui leading-relaxed text-muted">{t('chain.restedOnLead')}</p>
              <ul className="space-y-2">
                {items.map((x) => (
                  <li key={`${x.kind}-${x.id}`} className="text-ui leading-snug">
                    <span className="text-label font-bold uppercase tracking-caps text-muted">
                      {t(`chain.kind.${x.kind}`)}
                    </span>{' '}
                    <span className="text-paper">{x.title}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    <DateText iso={x.at} />
                    {/* Said, never judged. Whether it has to be run again is
                        the board's to say and this has no field for it. */}
                    {x.againstTheseTerms === true && (
                      <span className="ms-1.5 text-breach">{t('chain.sameTerms')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
