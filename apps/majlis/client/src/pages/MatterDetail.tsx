import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Section, Sources, Tag } from '../components/ui.js';
import { State, toneForStatus } from '../components/kit.js';
import Deliberation from '../components/Deliberation.js';
import { oversight } from '../lib/api.js';
import Evidence from '../components/Evidence.js';
import Precedent from '../components/Precedent.js';
import Terms from '../components/Terms.js';
import { DocumentLink } from '../components/Documents.js';
import Checklist from '../components/Checklist.js';
import Screening from '../components/Screening.js';
import VotePanel from '../components/VotePanel.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import Passage from '../components/Passage.js';
import Carrying from '../components/Carrying.js';
import Inherited from '../components/Inherited.js';

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

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <State tone={matter.direction === 'restrict' ? 'breach' : 'settled'}>
          {t(`matter.direction.${matter.direction}`)}
        </State>
        <State tone={toneForStatus(matter.status)}>{t(`matter.status.${matter.status}`)}</State>
        <span className="text-[12px] text-muted">
          {t(`matter.origin.${matter.origin}`)}
          <span className="mx-1.5 opacity-40">·</span>
          <DateText iso={matter.openedAt} />
        </span>
      </div>

      <h1
        className="mb-4 max-w-[21ch] font-display text-[32px] font-normal leading-[1.12] tracking-[-0.024em] sm:text-[38px]"
        style={{ textWrap: 'balance' }}
      >
        {matter.title}
      </h1>

      <p className="mb-7 max-w-[62ch] text-[13px] leading-[1.65] text-muted">
        {t(`matter.direction.${matter.direction}Note`)}
      </p>

      {/*
        Where this stands and what is next, above everything else on the page.
        Every panel below was already here; what was missing is the order, and
        a member who has not done this before could not tell whether the matter
        was nearly decided or barely begun.
      */}
      <Passage matterId={matter.id} />

      {/*
        Two columns: the question, and the act.

        Everything on this page used to be one stack, so a member reading a
        long matter had scrolled the thing they came to do off the screen by
        the time they had read enough to do it. The tally and the vote now sit
        in a column of their own and stay in view — which is the arrangement
        the artboard draws, and the reason it draws it.
      */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">

      {/*
        What the board already decided about a question of this shape, above
        the work rather than at the bottom with the related reading. This is
        the panel that turns authoring into correcting.
      */}
      <Inherited matterId={matter.id} canRule={mayDeliberate(identity?.role)} />

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
          <p className="rounded-card bg-raised/60 px-5 py-4 text-[12.5px] leading-[1.6] text-muted shadow-ring">
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

      {/*
        What the terms will do, immediately above the terms themselves. A
        scholar is about to set a number, and when it gets tested changes what
        setting it means.
      */}
      <Carrying matterId={matter.id} />

      <Section title={t('matter.parameters')}>
        <Card>
          <div className="mb-3 font-display text-[20px] leading-snug tracking-[-0.014em]">
            {rule.title}
          </div>
          <p className="mb-5 border-s-2 border-gold/50 ps-4 font-display text-[16px] leading-[1.55] text-paper">
            {rule.statement}
          </p>

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
              <span className="font-display text-[30px] leading-none tracking-[-0.026em] text-lapis tabular-nums">
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
      {/*
        The shape, before the arithmetic and before the vote. A board handed the
        conditions it recognises spends its time on the judgement rather than on
        composing the question, which is the whole compression argument applied
        to a single product.
      */}
      <Section title={t('chk.title')}>
        <Checklist matterId={matter.id} canRule={mayDeliberate(identity?.role)} />
      </Section>

      {/*
        A tool, not a finding. It sits beside the evidence because that is what
        the arithmetic is: something the board looks at before ruling, in the
        matter it is ruling on, rather than in a calculator somewhere else with
        no record of what was computed or from whose figures.
      */}
      <Section title={t('screen.title')}>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">{t('screen.intro')}</p>
        <Screening />
      </Section>

      <Section title={t('related.title')}>
        <Precedent matterId={matter.id} />
      </Section>

      {matter.reasoning.length > 0 && (
        <Section title={t('matter.reasoning')}>
          <ul className="space-y-4">
            {matter.reasoning.map((r, i) => (
              <li
                key={i}
                className={
                  'rounded-card px-5 py-4 ' +
                  (r.releasedAt ? 'bg-raised/50 shadow-ring' : 'bg-raised shadow-card')
                }
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                  <span className={r.releasedAt ? 'text-muted' : 'font-semibold text-lapis'}>{r.scholarId}</span>
                  <Tag tone={r.releasedAt ? 'neutral' : r.position === 'against' ? 'warn' : 'neutral'}>
                    {r.position}
                  </Tag>
                  <span className="text-muted">
                    <DateText iso={r.at} />
                  </span>
                  {r.releasedAt && (
                    <span className="rounded-full bg-black/[0.045] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
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
        </div>

        {/*
          The act. Sticky, because a member who has read four screens of
          argument should not have to find their way back to the thing they
          read it for.
        */}
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[364px]">
          <Section title={t('vote.tally')}>
            <VotePanel
              matter={matter}
              role={identity?.role}
              scholarId={identity?.scholarId}
              onChanged={setMatter}
            />
          </Section>
        </aside>
      </div>
    </article>
  );
}
