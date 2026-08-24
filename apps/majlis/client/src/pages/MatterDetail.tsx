import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Section, Sources, Tag } from '../components/ui.js';
import Deliberation from '../components/Deliberation.js';
import VotePanel from '../components/VotePanel.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';

export default function MatterDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [matter, setMatter] = useState<Matter | null>(null);
  const [failed, setFailed] = useState(false);
  const { identity } = useIdentity();

  useEffect(() => {
    if (!id) return;
    api.matter(id).then(setMatter).catch(() => setFailed(true));
  }, [id]);

  if (failed) return <ErrorText />;
  if (!matter) return <Loading />;

  const rule = matter.proposedRule;

  return (
    <article>
      <Link to="/" className="mb-4 inline-block text-[13px] text-muted hover:text-paper">
        ← {t('common.back')}
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tag tone={matter.direction === 'restrict' ? 'warn' : 'gold'}>
          {t(`matter.direction.${matter.direction}`)}
        </Tag>
        <Tag>{t(`matter.status.${matter.status}`)}</Tag>
      </div>

      <h1 className="mb-2 text-[21px] font-semibold leading-tight">{matter.title}</h1>
      <div className="mb-6 text-[12px] text-muted">
        {t(`matter.origin.${matter.origin}`)}
        <span className="mx-1.5 opacity-40">·</span>
        <DateText iso={matter.openedAt} />
      </div>

      <div className="mb-7 rounded-lg border border-line bg-surface/60 px-4 py-3 text-[13px] leading-relaxed text-muted">
        {t(`matter.direction.${matter.direction}Note`)}
      </div>

      <Section title={t('matter.proposal')}>
        <p>{matter.proposal}</p>
      </Section>

      <Section title={t('matter.notDecided')}>
        <ul className="space-y-2">
          {matter.notDecided.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('matter.mechanism')}>
        <p>{matter.mechanism}</p>
      </Section>

      <Section title={t('matter.parameters')}>
        <Card>
          <div className="mb-3 text-[14px] font-medium">{rule.title}</div>
          <p className="mb-4 text-[14px] text-paper/80">{rule.statement}</p>
          <dl className="space-y-3">
            {rule.parameters.map((p) => (
              <div key={p.key} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <dt className="font-mono text-[12px] text-goldsoft break-all">
                  {p.key} = {p.value}
                  {p.unit ? <span className="text-muted"> {p.unit}</span> : null}
                </dt>
                <dd className="mt-1 text-[13px] text-paper/75">{p.meaning}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 border-t border-line pt-3">
            <div className="font-mono text-[10px] break-all text-muted">{rule.parameterHash}</div>
            <div className="mt-1.5">
              {rule.parameterHashVerified ? (
                <Tag tone="ok">{t('rule.hashOk')}</Tag>
              ) : (
                <Tag tone="warn">{t('rule.hashBad')}</Tag>
              )}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">{t('rule.hashExplain')}</p>
          </div>
        </Card>
      </Section>

      {matter.simulation && (
        <Section title={t('matter.simulation')}>
          <Card>
            <div className="mb-3 text-[14px]">
              <span className="text-[22px] font-semibold text-goldsoft tabular-nums">
                {matter.simulation.transactionsAffected}
              </span>{' '}
              <span className="text-muted">
                {t('sim.of')} {matter.simulation.transactionsExamined.toLocaleString()}{' '}
                {t('sim.transactions')} {t('sim.affected')}
              </span>
            </div>
            <div className="mb-4 text-[12px] text-muted">
              {t('sim.window')} <DateText iso={matter.simulation.windowFrom} /> —{' '}
              <DateText iso={matter.simulation.windowTo} />
            </div>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">
              {t('sim.sample')}
            </div>
            <ul className="space-y-2.5">
              {matter.simulation.affectedSample.map((s) => (
                <li key={s.hash} className="border-t border-line pt-2.5 first:border-0 first:pt-0">
                  <div className="font-mono text-[11px] text-muted">{s.hash}</div>
                  <div className="text-[13px]">{s.asset}</div>
                  <div className="text-[12px] text-paper/70">{s.reason}</div>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-[13px] text-paper/75">
              {matter.simulation.note}
            </p>
          </Card>
        </Section>
      )}

      <Section title={t('matter.deliberation')}>
        <Deliberation
          matter={matter}
          canSpeak={mayDeliberate(identity?.role)}
          onChanged={setMatter}
        />
      </Section>

      {/*
        What this member can still do sits after the argument and before the
        record of positions already taken: you read what was said, then act,
        then see where everyone stands.
      */}
      <Section title={t('vote.tally')}>
        <VotePanel
          matter={matter}
          role={identity?.role}
          scholarId={identity?.scholarId}
          onChanged={setMatter}
        />
      </Section>

      {matter.reasoning.length > 0 && (
        <Section title={t('matter.reasoning')}>
          <ul className="space-y-4">
            {matter.reasoning.map((r, i) => (
              <li key={i} className="rounded-lg border border-line p-3.5">
                <div className="mb-1.5 flex items-center gap-2 text-[12px]">
                  <span className="text-goldsoft">{r.scholarId}</span>
                  <Tag tone={r.position === 'against' ? 'warn' : 'neutral'}>{r.position}</Tag>
                  <span className="text-muted">
                    <DateText iso={r.at} />
                  </span>
                </div>
                <p className="text-[14px] leading-relaxed">{r.reason}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Sources sources={[...matter.sources, ...rule.sources]} />
    </article>
  );
}
