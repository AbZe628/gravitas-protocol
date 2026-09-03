import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { oversight, type Incident } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, ErrorText, Loading, Tag } from '../components/ui.js';
import { ClockLine } from './Incidents.js';
import { mayRecordInstitutionAct, mayVote, useIdentity } from '../lib/identity.js';

/**
 * One reported non-compliance, as the nine steps it actually is.
 *
 * The sequence is the interface. A scholar arriving here needs to know where
 * this has got to, what happens next and whose it is — and three of the nine
 * steps are theirs while four belong to the institution. Showing them as one
 * undifferentiated list of buttons would hide the distinction that matters
 * most: a board cannot file the institution's rectification plan, and an
 * interface that appeared to let them would be inviting a document that says
 * something nobody outside the room ever said.
 *
 * So each step names whose it is, and a step that is not yours is shown without
 * a control rather than hidden. Knowing that the Directors have not yet
 * approved is information; discovering the step exists only when it becomes
 * yours is not.
 *
 * Nothing here decides anything. Every action posts to a route that runs the
 * service against the stored record inside a transaction, and a refusal is
 * shown in the server's own words rather than replaced with an apology.
 */

type Owner = 'board' | 'institution' | 'directors' | 'system';

interface Step {
  n: number;
  owner: Owner;
  label: string;
  done: boolean;
  current: boolean;
  detail?: ReactNode;
  action?: ReactNode;
}

function Reason({
  label,
  onSubmit,
  tone = 'neutral',
  placeholder,
}: {
  label: string;
  onSubmit: (text: string) => Promise<void>;
  tone?: 'neutral' | 'gold' | 'warn';
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  const border = tone === 'warn' ? 'border-warn/60 text-warn' : tone === 'gold' ? 'border-gold/60 text-goldsoft' : 'border-line text-muted';

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={`rounded border px-3 py-1.5 text-[13px] ${border}`}>
        {label}
      </button>
    );
  }

  return (
    <div className="mt-1">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="mb-2 h-20 w-full rounded border border-line bg-transparent px-3 py-2 text-[14px]"
      />
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(text);
              setOpen(false);
              setText('');
            } finally {
              setBusy(false);
            }
          }}
          className={`rounded border px-3 py-1.5 text-[13px] disabled:opacity-50 ${border}`}
        >
          {label}
        </button>
        <button onClick={() => setOpen(false)} className="rounded border border-line px-3 py-1.5 text-[13px] text-muted">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

export default function IncidentDetail() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [failed, setFailed] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const load = () =>
    oversight
      .incident(id)
      .then(setIncident)
      .catch(() => setFailed(true));

  useEffect(() => {
    void load();
  }, [id]);

  if (failed) return <ErrorText />;
  if (!incident) return <Loading />;

  const i = incident;
  const board = mayVote(identity?.role);
  const clerk = mayRecordInstitutionAct(identity?.role, identity?.office);
  const plan = i.plan ?? null;
  const determined = i.actual === true;

  /** Every action goes through here so a refusal is shown, never swallowed. */
  async function act(fn: () => Promise<Incident>) {
    setRefusal(null);
    try {
      setIncident(await fn());
    } catch (e) {
      setRefusal(e instanceof Error ? e.message : String(e));
      await load();
    }
  }

  const mine = (o: Owner) =>
    o === 'board' ? t('snc.owner.board') : o === 'institution' ? t('snc.owner.institution') : o === 'directors' ? t('snc.owner.directors') : t('snc.owner.system');

  const steps: Step[] = [
    {
      n: 1,
      owner: 'institution',
      label: t('snc.step.reported'),
      done: true,
      current: false,
      detail: (
        <>
          {i.reportedBy} · <DateText iso={i.reportedAt} />
        </>
      ),
    },
    {
      n: 2,
      owner: 'board',
      label: t('snc.step.determine'),
      done: i.actual !== null,
      current: i.stage === 'reported',
      detail:
        i.concurrences.length > 0 ? (
          <ul className="space-y-1.5">
            {i.concurrences.map((c, k) => (
              <li key={k}>
                <span className={c.actual ? 'text-warn' : 'text-emerald-400'}>
                  {c.actual ? t('snc.isBreach') : t('snc.notBreach')}
                </span>
                <span className="mx-1.5 opacity-40">·</span>
                {c.scholarId}
                <p className="mt-0.5 text-muted">{c.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-muted">{t('snc.noPositions')}</span>
        ),
      action:
        i.stage === 'reported' && board ? (
          <div className="flex flex-col gap-2">
            <Reason
              label={t('snc.recordBreach')}
              tone="warn"
              placeholder={t('snc.reasonHint')}
              onSubmit={(text) => act(() => oversight.concur(id, true, text))}
            />
            <Reason
              label={t('snc.recordNoBreach')}
              placeholder={t('snc.reasonHint')}
              onSubmit={(text) => act(() => oversight.concur(id, false, text))}
            />
          </div>
        ) : undefined,
    },
    {
      n: 3,
      owner: 'board',
      label: t('snc.step.stop'),
      done: i.stopped.length > 0,
      current: determined && i.stopped.length === 0,
      detail:
        i.stopped.length > 0 ? (
          <ul className="list-disc pl-4">
            {i.stopped.map((a, k) => (
              <li key={k}>{a}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted">{t('snc.nothingStopped')}</span>
        ),
      action:
        determined && board ? (
          <Reason
            label={t('snc.recordStopped')}
            tone="warn"
            placeholder={t('snc.stoppedHint')}
            onSubmit={(text) =>
              act(() => oversight.stop(id, text.split('\n').map((x) => x.trim()).filter(Boolean)))
            }
          />
        ) : undefined,
    },
    {
      n: 4,
      owner: 'institution',
      label: t('snc.step.plan'),
      done: plan !== null,
      current: i.stage === 'determined',
      detail: plan ? (
        <ol className="list-decimal space-y-1 pl-4">
          {plan.steps.map((s, k) => (
            <li key={k}>{s}</li>
          ))}
        </ol>
      ) : i.plans.length > 0 ? (
        <span className="text-warn">
          {t('snc.planReturned')} {i.plans[i.plans.length - 1].returnedReason}
        </span>
      ) : (
        <span className="text-muted">{t('snc.noPlan')}</span>
      ),
      action:
        i.stage === 'determined' && clerk ? (
          <Reason
            label={t('snc.filePlan')}
            placeholder={t('snc.planHint')}
            onSubmit={(text) =>
              act(() =>
                oversight.filePlan(
                  id,
                  text.split('\n').map((x) => x.trim()).filter(Boolean),
                  new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
                ),
              )
            }
          />
        ) : undefined,
    },
    {
      n: 5,
      owner: 'board',
      label: t('snc.step.endorse'),
      done: Boolean(plan?.endorsedAt),
      current: i.stage === 'plan_filed',
      detail: plan?.endorsedBy.length ? (
        <span>{plan.endorsedBy.join(', ')}</span>
      ) : (
        <span className="text-muted">{t('snc.notEndorsed')}</span>
      ),
      action:
        i.stage === 'plan_filed' && board ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => act(() => oversight.endorsePlan(id))}
              className="rounded border border-gold/60 px-3 py-1.5 text-[13px] text-goldsoft"
            >
              {t('snc.endorse')}
            </button>
            <Reason
              label={t('snc.returnPlan')}
              placeholder={t('snc.returnHint')}
              onSubmit={(text) => act(() => oversight.returnPlan(id, text))}
            />
          </div>
        ) : undefined,
    },
    {
      n: 6,
      owner: 'directors',
      label: t('snc.step.directors'),
      done: i.directorsApprovedAt !== null,
      current: i.stage === 'endorsed',
      detail: i.directorsApprovedAt ? <DateText iso={i.directorsApprovedAt} /> : <span className="text-muted">—</span>,
      action:
        i.stage === 'endorsed' && clerk ? (
          <button
            onClick={() => act(() => oversight.directors(id))}
            className="rounded border border-line px-3 py-1.5 text-[13px] text-muted"
          >
            {t('snc.recordDirectors')}
          </button>
        ) : undefined,
    },
    {
      n: 7,
      owner: 'institution',
      label: t('snc.step.regulator'),
      done: i.submittedToRegulatorAt !== null,
      current: i.stage === 'approved',
      detail: i.submittedToRegulatorAt ? (
        <DateText iso={i.submittedToRegulatorAt} />
      ) : (
        <span className="text-muted">—</span>
      ),
      action:
        i.stage === 'approved' && clerk ? (
          <button
            onClick={() => act(() => oversight.submission(id))}
            className="rounded border border-line px-3 py-1.5 text-[13px] text-muted"
          >
            {t('snc.recordSubmission')}
          </button>
        ) : undefined,
    },
    {
      n: 8,
      owner: 'board',
      label: t('snc.step.purify'),
      done: Boolean(i.purification?.paidAt),
      current: determined && !i.purification,
      detail: i.purification ? (
        <>
          <span className="tabular-nums">
            {i.purification.amount} {i.purification.currency}
          </span>{' '}
          → {i.purification.destination}
          <br />
          {i.purification.paidAt ? (
            <span className="text-emerald-400">
              {t('snc.paid')} <DateText iso={i.purification.paidAt} />
            </span>
          ) : (
            <span className="text-warn">{t('snc.outstanding')}</span>
          )}
        </>
      ) : (
        <span className="text-muted">{t('snc.notPrescribed')}</span>
      ),
      action: (
        <>
          {determined && board && !i.purification && (
            <PrescribeForm onSubmit={(p) => act(() => oversight.prescribe(id, p))} />
          )}
          {i.purification && !i.purification.paidAt && clerk && (
            <Reason
              label={t('snc.recordPaid')}
              placeholder={t('snc.paidHint')}
              onSubmit={(text) => act(() => oversight.purificationPaid(id, text))}
            />
          )}
        </>
      ),
    },
    {
      n: 9,
      owner: 'board',
      label: t('snc.step.close'),
      done: i.stage === 'closed',
      current: i.stage === 'submitted' || i.stage === 'not_actual',
      detail: i.closedAt ? <DateText iso={i.closedAt} /> : <span className="text-muted">—</span>,
      action:
        (i.stage === 'submitted' || i.stage === 'not_actual') && board ? (
          <button
            onClick={() => act(() => oversight.closeIncident(id))}
            className="rounded border border-line px-3 py-1.5 text-[13px] text-muted"
          >
            {t('snc.close')}
          </button>
        ) : undefined,
    },
  ];

  return (
    <div>
      <div className="mb-1 font-mono text-[12px] text-muted">{i.reference}</div>
      <h1 className="mb-2 text-[19px] font-semibold leading-snug">{i.title}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tag tone={i.clock?.overdue ? 'warn' : i.stage === 'closed' ? 'ok' : undefined}>
          {t(`snc.stage.${i.stage}`)}
        </Tag>
        <ClockLine incident={i} />
      </div>

      {i.clock && (
        <p
          className={
            'mb-5 rounded-lg border px-4 py-3 text-[13px] leading-relaxed ' +
            (i.clock.overdue ? 'border-warn/60 bg-warn/[0.06] text-warn' : 'border-line bg-surface/60 text-muted')
          }
        >
          {i.clock.note}
        </p>
      )}

      <p className="mb-6 text-[15px] leading-relaxed">{i.report}</p>

      {refusal && (
        <div className="mb-5 rounded-lg border border-warn/60 bg-warn/[0.06] px-4 py-3 text-[13px] leading-relaxed text-warn">
          {refusal}
        </div>
      )}

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
        {t('snc.sequence')}
      </h2>

      <ol className="space-y-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className={
              'grid grid-cols-[28px_1fr] gap-3 rounded-lg border px-4 py-3 ' +
              (s.current ? 'border-gold/50 bg-gold/[0.05]' : s.done ? 'border-line' : 'border-line/50 opacity-70')
            }
          >
            <div className="pt-0.5 font-mono text-[12px] text-muted tabular-nums">
              {s.done ? '✓' : String(s.n).padStart(2, '0')}
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <span className="text-[14px] font-medium">{s.label}</span>
                <span className="text-[11px] uppercase tracking-wider text-muted">{mine(s.owner)}</span>
              </div>
              <div className="text-[13px] leading-relaxed">{s.detail}</div>
              {s.action && <div className="mt-2.5">{s.action}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PrescribeForm({
  onSubmit,
}: {
  onSubmit: (p: { amount: string; currency: string; destination: string }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState({ amount: '', currency: 'EUR', destination: '' });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded border border-gold/60 px-3 py-1.5 text-[13px] text-goldsoft">
        {t('snc.prescribe')}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={p.amount}
          onChange={(e) => setP({ ...p, amount: e.target.value })}
          placeholder="12480.55"
          className="w-32 rounded border border-line bg-transparent px-3 py-2 text-[14px] tabular-nums"
        />
        <input
          value={p.currency}
          onChange={(e) => setP({ ...p, currency: e.target.value })}
          className="w-20 rounded border border-line bg-transparent px-3 py-2 text-[14px]"
        />
      </div>
      <input
        value={p.destination}
        onChange={(e) => setP({ ...p, destination: e.target.value })}
        placeholder={t('snc.destinationHint')}
        className="w-full rounded border border-line bg-transparent px-3 py-2 text-[14px]"
      />
      <p className="text-[11px] leading-relaxed text-muted">{t('snc.destinationNote')}</p>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await onSubmit(p);
            setOpen(false);
          }}
          className="rounded border border-gold/60 px-3 py-1.5 text-[13px] text-goldsoft"
        >
          {t('snc.prescribe')}
        </button>
        <button onClick={() => setOpen(false)} className="rounded border border-line px-3 py-1.5 text-[13px] text-muted">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
