import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Section, Sources, Tag } from '../components/ui.js';
import Deliberation from '../components/Deliberation.js';
import { oversight } from '../lib/api.js';
import Evidence from '../components/Evidence.js';
import Precedent from '../components/Precedent.js';
import Terms from '../components/Terms.js';
import { DocumentLink } from '../components/Documents.js';
import VotePanel from '../components/VotePanel.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';

/** The statuses a document exists for. Mirrors SETTLED in services/fatwa.ts. */
const DECIDED = ['in_force', 'timelock', 'rejected', 'lapsed', 'withdrawn'];

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

      <div className="mb-5 rounded-lg border border-line bg-surface/60 px-4 py-3 text-[13px] leading-relaxed text-muted">
        {t(`matter.direction.${matter.direction}Note`)}
      </div>

      {/*
        The document, at the moment of decision. High on the page because for
        anyone arriving after the board has ruled — the business unit, the
        auditor, the regulator — it is the only thing they came for.

        A matter still being decided produces no document at all, and the space
        says why rather than hiding: a page that looked final for an open
        question would be acted on.
      */}
      <div className="mb-7">
        {DECIDED.includes(matter.status) ? (
          <DocumentLink
            emphasis
            href={oversight.hrefs.fatwa(matter.id)}
            label={t('doc.fatwa')}
            note={t(matter.status === 'timelock' ? 'doc.fatwaPending' : 'doc.fatwaNote')}
          />
        ) : (
          <p className="rounded-lg border border-line/60 px-4 py-3 text-[12.5px] leading-relaxed text-muted">
            {t('doc.fatwaNotYet')}
          </p>
        )}
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

          {/*
            The terms, the hash and whether they can still be changed. A board
            can decide to permit something; saying at what ratio, measured how
            often, and what happens when it drifts is the part an institution
            has to implement.
          */}
          <Terms matter={matter} canEdit={mayDeliberate(identity?.role)} onChanged={setMatter} />

          {rule.parameterHash && (
            <div className="mt-4 border-t border-line pt-3">
              {rule.parameterHashVerified ? (
                <Tag tone="ok">{t('rule.hashOk')}</Tag>
              ) : (
                <Tag tone="warn">{t('rule.hashBad')}</Tag>
              )}
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{t('rule.hashExplain')}</p>
            </div>
          )}
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
      {/*
        Evidence sits before the tally on purpose: what the board is arguing
        from is what a member needs in front of them before being asked to take
        a position.
      */}
      <Section title={t('evidence.title')}>
        <Evidence
          matter={matter}
          scholarId={identity?.scholarId}
          canAttach={mayDeliberate(identity?.role)}
          onChanged={setMatter}
        />
      </Section>

      {/*
        After the evidence and before the vote: what the board already decided
        about this is part of what a member should have in front of them.
      */}
      <Section title={t('related.title')}>
        <Precedent matterId={matter.id} />
      </Section>

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
              <li
                key={i}
                className={
                  'rounded-lg border p-3.5 ' +
                  (r.releasedAt ? 'border-line/50 bg-surface/20' : 'border-line')
                }
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                  <span className={r.releasedAt ? 'text-muted' : 'text-goldsoft'}>{r.scholarId}</span>
                  <Tag tone={r.releasedAt ? 'neutral' : r.position === 'against' ? 'warn' : 'neutral'}>
                    {r.position}
                  </Tag>
                  <span className="text-muted">
                    <DateText iso={r.at} />
                  </span>
                  {r.releasedAt && (
                    <span className="rounded border border-line px-1.5 py-0.5 text-[10.5px] uppercase tracking-wide text-muted">
                      {t('vote.released')}
                    </span>
                  )}
                </div>
                <p className={'text-[14px] leading-relaxed ' + (r.releasedAt ? 'text-muted' : '')}>
                  {r.reason}
                </p>
                {r.releasedAt && (
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                    {t('vote.releasedNote')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Sources sources={[...matter.sources, ...rule.sources]} />
    </article>
  );
}
