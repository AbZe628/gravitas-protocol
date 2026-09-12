import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Division, Gaps, Nothing, PageHead } from '../components/page.js';
import { Card, State } from '../components/kit.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useStillThere } from '../lib/stillThere.js';

/**
 * What this board has decided that the institution has to keep to.
 *
 * ── the same rulings, read the other way round ────────────────────────────
 *
 * `/rules` is the board's screen: what stands, how it was arrived at, when it
 * comes up for review. A bank opening it was reading a governance record and
 * having to work out the operational consequence for itself.
 *
 * This is the same rulings answering the only question a desk asks of them:
 * *what may I do, and what may I not*. So each one leads with its condition
 * in the board's own sentence, then the figures a desk has to hold to, then
 * what happens if it does not — and the governance detail is a link rather
 * than the page.
 *
 * ── the figures are the board's, unconverted ──────────────────────────────
 *
 * A ratio the board set in basis points is shown in basis points, with the
 * board's own sentence saying what it means beside it. Restating 5100 as
 * 51% would be this screen doing arithmetic on a binding term, and the day
 * the rounding differs from the board's is the day a desk acts on a number
 * the board never wrote.
 *
 * ── a ruling not yet in force says so ─────────────────────────────────────
 *
 * `inForceFrom` in the future is a decision made and not yet binding, and a
 * desk reading it as binding today would restrict itself early — or, the
 * other way round on a permission, act early. It is listed apart, with the
 * date.
 */

/** The figures a desk has to keep to, each with the board's own meaning. */
function Terms({ rule }: { rule: Rule }) {
  const { t } = useI18n();
  if (rule.parameters.length === 0) return null;

  return (
    <div className="mt-3.5">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {t('binds.terms')}
      </div>
      <ul className="space-y-2">
        {rule.parameters.map((p) => (
          <li key={p.key} className="rounded-xl bg-raised px-3.5 py-2.5 shadow-ring">
            {/*
              The board's sentence first, the figure beside it, the key
              underneath and small. A desk reads the sentence; an auditor
              tracing a term back to the record needs the key.
            */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="max-w-[54ch] text-[12.5px] leading-[1.55]">{p.meaning}</span>
              <span className="shrink-0 font-mono text-[13px] tabular-nums">
                {p.value}
                {p.unit && <span className="ms-1.5 text-[11px] text-muted">{p.unit}</span>}
              </span>
            </div>
            <div className="mt-1 font-mono text-[10.5px] text-muted opacity-70">{p.key}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function One({ rule, pending }: { rule: Rule; pending: boolean }) {
  const { t } = useI18n();

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {pending ? (
          <State tone="attention">{t('binds.notYet')}</State>
        ) : (
          <State tone="settled">{t('binds.inForce')}</State>
        )}
        {rule.inForceFrom && (
          <span className="text-[11.5px] text-muted">
            {pending ? t('binds.from') : t('binds.since')}{' '}
            <span className="font-mono">{rule.inForceFrom.slice(0, 10)}</span>
          </span>
        )}
      </div>

      <div className="font-display text-[17px] leading-snug">{rule.title}</div>

      {/* The condition itself, in the board's words and at reading size. */}
      <p className="mt-2.5 max-w-[62ch] font-display text-[15.5px] leading-[1.55]">
        {rule.statement}
      </p>

      <Terms rule={rule} />

      {/*
        Two onward steps, and they are the two a desk actually takes: read a
        contract against this, or ask the board about it.
      */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
        <Link to="/check" className="font-semibold text-lapis underline underline-offset-2">
          {t('binds.checkAgainst')}
        </Link>
        <Link to="/ask" className="text-lapis underline underline-offset-2">
          {t('binds.askAboutIt')}
        </Link>
        <span className="font-mono text-[10.5px] text-muted opacity-70">{rule.id}</span>
      </div>
    </Card>
  );
}

export default function BindsMe() {
  const { t } = useI18n();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  useEffect(() => {
    api
      .rules()
      .then((got) => {
        there.arrived();
        setRules(Array.isArray(got) ? got : []);
      })
      .catch(() => there.lost(setFailed));
  }, []);

  if (failed) return <ErrorText />;
  if (!rules) return <Loading />;

  const now = Date.now();
  const isPending = (r: Rule) =>
    r.inForceFrom !== null && new Date(r.inForceFrom).getTime() > now;

  const binding = rules.filter((r) => !isPending(r));
  const coming = rules.filter(isPending);

  return (
    <div>
      <PageHead
        phase="bindsme"
        title={t('binds.title')}
        says={t('binds.says')}
        live={
          binding.length === 0
            ? t('binds.noneYet')
            : `${binding.length} ${t('binds.bindingNow')}`
        }
      />

      {rules.length === 0 ? (
        <Nothing>{t('binds.nothing')}</Nothing>
      ) : (
        <>
          <Division heading={t('binds.bindsYouNow')} note={t('binds.bindsYouNow.note')}>
            {binding.length === 0 ? (
              <Nothing>{t('binds.noneBinding')}</Nothing>
            ) : (
              <div className="space-y-3">
                {binding.map((r) => (
                  <One key={r.id} rule={r} pending={false} />
                ))}
              </div>
            )}
          </Division>

          {/*
            Decided and not yet binding. Kept apart rather than mixed in,
            because a desk that read one of these as binding today would
            restrict itself early — or act early on a permission.
          */}
          {coming.length > 0 && (
            <Division heading={t('binds.willBind')} note={t('binds.willBind.note')}>
              <div className="space-y-3">
                {coming.map((r) => (
                  <One key={r.id} rule={r} pending />
                ))}
              </div>
            </Division>
          )}
        </>
      )}

      <Gaps items={[t('binds.gap.thisBoard'), t('binds.gap.notAdvice'), t('binds.gap.superseded')]} />
    </div>
  );
}
