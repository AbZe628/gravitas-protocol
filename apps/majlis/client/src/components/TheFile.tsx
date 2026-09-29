import type { Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import Fold from './Fold.js';
import InTheMargin from './InTheMargin.js';
import Inherited from './Inherited.js';
import Carrying from './Carrying.js';
import Terms from './Terms.js';
import WhatMustHappen from './WhatMustHappen.js';
import ReadTheContract from './ReadTheContract.js';
import WhatTheCommitteeFound from './WhatTheCommitteeFound.js';
import Screening from './Screening.js';
import Person from './Person.js';
import { DateText, Sources, Tag } from './ui.js';

/**
 * Everything on a matter that is not the step in front of the member.
 *
 * ── what it replaces ──────────────────────────────────────────────────────
 *
 * A matter had three screens: the window at `/matters/:id`, a dossier at
 * `/dossier/matters/:id` and the classic page at `/classic/matters/:id`. The
 * window showed one step at a time and the other two showed everything — and
 * a control written into one of the three was on one of the three. In this
 * very run the assignment control went into the dossier, which the list does
 * not open, and every test was green against a screen nobody reached. Three
 * screens for one thing are three places for a fault to hide.
 *
 * So there is one. What only the other two had is here, under the brief
 * that opens the window: what the bank sent, then the file — each part
 * folded, named, and one press away, so the window stays a window and
 * nothing that was on the matter is gone from it. The two old addresses
 * lead here.
 */
export default function TheFile({
  matter,
  onChanged,
}: {
  matter: Matter;
  onChanged: (m: Matter) => void;
}) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const canRule = mayDeliberate(identity?.role);
  const rule = matter.proposedRule;

  return (
    <section aria-label={t('file.title')} className="mt-8 border-t border-line pt-6">
      <h2 className="mb-1 text-label font-bold uppercase tracking-caps text-muted">{t('file.title')}</h2>
      <p className="mb-4 max-w-[62ch] text-note leading-relaxed text-muted">{t('file.says')}</p>

      {matter.mechanism && (
        <Fold heading={t('matter.mechanism')}>
          <p className="max-w-[62ch] font-read text-body leading-relaxed text-paper">{matter.mechanism}</p>
        </Fold>
      )}

      {/* Notes left on the question itself, by the members reading it. */}
      <Fold heading={t('file.margin')}>
        <InTheMargin on="proposal" subjectId={matter.id} />
      </Fold>

      {/* What the board already decided about a question of this shape. */}
      <Fold heading={t('file.inherited')}>
        <Inherited matterId={matter.id} canRule={canRule} />
      </Fold>

      <Fold heading={t('matter.parameters')} summary={rule.title}>
        {/* What the terms will do, immediately above the terms themselves. */}
        <Carrying matterId={matter.id} />
        <p className="mb-5 mt-4 border-s-2 border-gold/50 ps-4 font-read text-lead leading-relaxed text-paper">
          {rule.statement}
        </p>
        <Terms matter={matter} canEdit={canRule} onChanged={onChanged} />
        {rule.parameterHash && (
          <div className="mt-4 border-t border-line pt-3">
            {rule.parameterHashVerified ? (
              <Tag tone="ok">{t('rule.hashOk')}</Tag>
            ) : (
              <Tag tone="warn">{t('rule.hashBad')}</Tag>
            )}
            <p className="mt-2 text-note leading-relaxed text-muted">{t('rule.hashExplain')}</p>
          </div>
        )}
        <Sources sources={rule.sources} />
      </Fold>

      {/* The other half of the same decision: what the institution does about it. */}
      <Fold heading={t('doing.title')}>
        <WhatMustHappen matter={matter} canEdit={canRule} onChanged={onChanged} />
      </Fold>

      {matter.simulation && (
        <Fold heading={t('matter.simulation')} summary={`${matter.simulation.transactionsAffected} ${t('sim.affected')}`}>
          <div className="mb-3 text-body">
            <span className="font-display text-head leading-none tracking-display text-lapis tabular-nums">
              {matter.simulation.transactionsAffected}
            </span>{' '}
            <span className="text-muted">
              {t('sim.of')} {matter.simulation.transactionsExamined.toLocaleString()} {t('sim.transactions')}{' '}
              {t('sim.affected')}
            </span>
          </div>
          <div className="mb-4 text-note text-muted">
            {t('sim.window')} <DateText iso={matter.simulation.windowFrom} /> —{' '}
            <DateText iso={matter.simulation.windowTo} />
          </div>
          <ul className="space-y-2.5">
            {matter.simulation.affectedSample.map((s) => (
              <li key={s.hash} className="border-t border-line pt-2.5 first:border-0 first:pt-0">
                <div className="font-mono text-note text-muted">{s.hash}</div>
                <div className="text-ui">{s.asset}</div>
                <div className="text-note text-sand">{s.reason}</div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-ui text-sand">{matter.simulation.note}</p>
        </Fold>
      )}

      {/* The contract, read against the shape — and what the committee found in it. */}
      <Fold heading={t('file.contract')}>
        <ReadTheContract matterId={matter.id} canRead={identity?.role !== 'observer'} />
      </Fold>
      <Fold heading={t('cttee.heading')}>
        <WhatTheCommitteeFound matterId={matter.id} />
      </Fold>

      {/* A tool, not a finding: the arithmetic a board looks at in the matter it is ruling on. */}
      <Fold heading={t('screen.title')}>
        <p className="mb-3 text-ui leading-relaxed text-muted">{t('screen.intro')}</p>
        <Screening />
      </Fold>

      {matter.reasoning.length > 0 && (
        <Fold heading={t('matter.reasoning')} summary={String(matter.reasoning.length)}>
          <ul className="space-y-4">
            {matter.reasoning.map((r, i) => (
              <li key={i} className={'rounded-card px-5 py-4 ' + (r.releasedAt ? 'bg-raised/50 shadow-ring' : 'bg-raised shadow-card')}>
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-note">
                  <span className={r.releasedAt ? 'text-muted' : 'font-semibold text-lapis'}>
                    <Person id={r.scholarId} />
                  </span>
                  <Tag tone={r.releasedAt ? 'neutral' : r.position === 'against' ? 'warn' : 'neutral'}>{r.position}</Tag>
                  <span className="text-muted">
                    <DateText iso={r.at} />
                  </span>
                  {r.releasedAt && (
                    <span className="rounded-full bg-black/[0.045] px-2.5 py-0.5 text-label font-bold uppercase tracking-label text-muted">
                      {t('vote.released')}
                    </span>
                  )}
                </div>
                <p className={'text-body leading-relaxed ' + (r.releasedAt ? 'text-muted' : '')}>{r.reason}</p>
                {r.releasedAt && <p className="mt-1.5 text-note leading-relaxed text-muted">{t('vote.releasedNote')}</p>}
              </li>
            ))}
          </ul>
        </Fold>
      )}
    </section>
  );
}
