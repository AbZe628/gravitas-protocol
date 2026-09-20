import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { oversight, type Incident } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, ErrorText, Loading, Tag } from '../components/ui.js';
import { ClockLine } from './Incidents.js';
import { mayRecordInstitutionAct, mayVote, useIdentity } from '../lib/identity.js';
import { Button } from '../components/Button';
import Act from '../components/Act.js';
import AfterAct from '../components/AfterAct.js';

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

  const skin =
    tone === 'warn'
      ? 'bg-raised text-breach shadow-ringbreach'
      : tone === 'gold'
        ? 'bg-raised font-medium text-lapis shadow-ringlapis'
        : 'bg-raised text-sand shadow-ring';

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className={`rounded-xl px-4 py-2 text-ui ${skin}`}>
        {label}
      </Button>
    );
  }

  return (
    <div className="mt-1">
      <textarea
        aria-label={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="mb-2 h-20 w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-body"
      />
      <div className="flex gap-2">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(text);
              setOpen(false);
              setText('');
            } catch {
              /*
               * Refused, or called off in the window that asks. What was
               * typed stays where it is: a plan is several lines of somebody
               * else's work, and retyping it is not a small thing. The
               * refusal itself is shown by the act.
               */
            } finally {
              setBusy(false);
            }
          }}
          className={`rounded-xl px-4 py-2 text-ui disabled:opacity-50 ${skin}`}
        >
          {label}
        </Button>
        <Button onClick={() => setOpen(false)} className="rounded-xl shadow-ring px-3 py-1.5 text-ui text-muted">
          {t('common.cancel')}
        </Button>
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
  /** Whether this breach has ever rendered. See the note on `load` below. */
  const shown = useRef(false);

  /** Which act has its window open. Null when none has. */
  const [acting, setActing] = useState<string | null>(null);
  /**
   * What the last act did, held by the screen.
   *
   * Not by the step that performed it: most of these change the stage, and a
   * stage change redraws the whole ladder — the step would be gone before
   * anybody read the sentence.
   */
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

  /**
   * The one window on this screen that takes its act as a task.
   *
   * Two acts here are raised from shared controls — `Reason` and
   * `PrescribeForm` — which other acts on this screen also use, and those
   * already have their own windows. Changing the controls would change all
   * of them. So the screen holds one window, and a control that wants
   * confirming hands it what to say, what to run and what follows.
   *
   * `calledOff` is how the control learns the window was closed without
   * the act being done, so it can keep what was typed.
   */
  const [zadatak, setZadatak] = useState<{
    title: string;
    does: string;
    means: string;
    run: () => Promise<void>;
    calledOff: () => void;
    after: {
      did: string;
      means: string;
      next: readonly { label: string; to?: string; says?: string }[];
    };
  } | null>(null);

  /*
   * A failed refresh must not take away a screen that is already there.
   *
   * Measured: press *Record: this is a breach* with no connection, and the
   * act correctly set its refusal — then `act` called this, this failed, and
   * `failed` replaced the entire page with "Could not load." The nine steps,
   * the report, the concurrences and the refusal itself all went, and a
   * scholar was left with three words that did not mention the thing they
   * had just pressed.
   *
   * So the failure is only fatal while there is nothing to show. Once the
   * breach has loaded, a later refresh that cannot reach the board leaves
   * what is on screen exactly where it is, and the act's own sentence is
   * what the reader sees.
   */
  const load = () =>
    oversight
      .incident(id)
      /*
       * Every list this screen walks, checked before it is set. A 200 with the
       * wrong shape threw inside render and React unmounted the whole tree, so
       * one absent field turned the nine steps into a blank page.
       */
      .then((r) => {
        if (r && Array.isArray(r.concurrences) && Array.isArray(r.stopped) && Array.isArray(r.plans)) {
          shown.current = true;
          setIncident(r);
        } else if (!shown.current) {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!shown.current) setFailed(true);
      });

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
                <span className={c.actual ? 'text-breach' : 'text-settled'}>
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
          <div className="flex flex-wrap gap-2">
            <Button tone="grave" size="sm" onClick={() => setActing('concurYes')}>
              {t('snc.recordBreach')}
            </Button>
            <Button tone="quiet" size="sm" onClick={() => setActing('concurNo')}>
              {t('snc.recordNoBreach')}
            </Button>
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
          <ul className="list-disc ps-4">
            {i.stopped.map((a, k) => (
              <li key={k}>{a}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted">{t('snc.nothingStopped')}</span>
        ),
      action:
        determined && board ? (
          <Button tone="quiet" size="sm" onClick={() => setActing('stop')}>
            {t('snc.recordStopped')}
          </Button>
        ) : undefined,
    },
    {
      n: 4,
      owner: 'institution',
      label: t('snc.step.plan'),
      done: plan !== null,
      current: i.stage === 'determined',
      detail: plan ? (
        <ol className="list-decimal space-y-1 ps-4">
          {plan.steps.map((s, k) => (
            <li key={k}>{s}</li>
          ))}
        </ol>
      ) : i.plans.length > 0 ? (
        <span className="text-breach">
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
              new Promise<void>((done, calledOff) => {
                setZadatak({
                  title: t('snc.filePlan'),
                  does: t('wm.filePlan.does'),
                  means: t('wm.filePlan.means'),
                  run: async () => {
                    setIncident(
                      await oversight.filePlan(
                        id,
                        text.split('\n').map((x) => x.trim()).filter(Boolean),
                        new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
                      ),
                    );
                    done();
                  },
                  calledOff: () => calledOff(new Error('called off')),
                  after: {
                    did: t('wm.filePlan.did'),
                    means: t('wm.filePlan.didMeans'),
                    next: [{ label: t('wm.next.checkPlan'), says: t('wm.next.checkPlanSays') }],
                  },
                });
              })
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
            <Button tone="act" size="sm" onClick={() => setActing('endorse')}>
              {t('snc.endorse')}
            </Button>
            <Button tone="grave" size="sm" onClick={() => setActing('returnPlan')}>
              {t('snc.returnPlan')}
            </Button>
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
          <Button tone="quiet" size="sm" onClick={() => setActing('directors')}>
            {t('snc.recordDirectors')}
          </Button>
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
          <Button tone="quiet" size="sm" onClick={() => setActing('submission')}>
            {t('snc.recordSubmission')}
          </Button>
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
            <span className="text-settled">
              {t('snc.paid')} <DateText iso={i.purification.paidAt} />
            </span>
          ) : (
            <span className="text-breach">{t('snc.outstanding')}</span>
          )}
        </>
      ) : (
        <>
          <span className="text-muted">{t('snc.notPrescribed')}</span>
          {/*
            Where the figure comes from, said rather than left to be guessed.

            The board is asked for an amount and given an empty box. It cannot
            work this one out: it is the income wrongly taken, which only the
            institution's own reconciliation produces — the endorsed plan on
            this very page says so in its own words, "report the reconciled
            figure to the board for a purification direction".

            The three sums on the calculations screen are for a holding with
            mixed income and would answer a different question. Sending a
            scholar there would waste the trip, so this says what is actually
            being waited for and when it was promised.
          */}
          {plan && (
            <p className="mt-1.5 max-w-[58ch] text-ui leading-relaxed text-muted">
              {t('snc.amountComesFrom')}
              {plan.completeBy && (
                <>
                  {' '}
                  {t('snc.planDueBy')} <DateText iso={plan.completeBy} />
                </>
              )}
            </p>
          )}
        </>
      ),
      action: (
        <>
          {determined && board && !i.purification && (
            <PrescribeForm
              onSubmit={(p) =>
                new Promise<void>((done, calledOff) => {
                  setZadatak({
                    title: t('snc.prescribe'),
                    does: t('wm.prescribe.does'),
                    means: t('wm.prescribe.means'),
                    run: async () => {
                      setIncident(await oversight.prescribe(id, p));
                      done();
                    },
                    calledOff: () => calledOff(new Error('called off')),
                    after: {
                      did: t('wm.prescribe.did'),
                      means: t('wm.prescribe.didMeans'),
                      next: [
                        {
                          label: t('wm.next.institutionPlan'),
                          says: t('wm.next.institutionPlanSays'),
                        },
                      ],
                    },
                  });
                })
              }
            />
          )}
          {i.purification && !i.purification.paidAt && clerk && (
            <Button tone="quiet" size="sm" onClick={() => setActing('paid')}>
              {t('snc.recordPaid')}
            </Button>
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
          <Button tone="quiet" size="sm" onClick={() => setActing('close')}>
            {t('snc.close')}
          </Button>
        ) : undefined,
    },
  ];

  /**
   * The ten acts, each with the window that says what it does.
   *
   * ── what they were, and why that was wrong ──────────────────────────────
   *
   * Four were bare buttons: endorsing a plan, telling the Directors, recording
   * the submission, closing the whole thing — all four fired on one press with
   * nothing said before or after. The other six asked for a reason and stopped
   * there, which is not the same: a box asking *why* does not say what the act
   * means, who outside this board sees it, or what the member does next.
   *
   * Every one of them now carries the clock, because the clock is what makes a
   * breach different from a matter: from the moment the board finds the event
   * actual, thirty days run that the institution is judged on.
   */
  const windows = (
    <>
      {/*
        The plan and the prescribed measure are raised from shared controls,
        so they hand this window what to say and what to run rather than each
        control carrying a window of its own.
      */}
      <Act
        open={zadatak !== null}
        onClose={() => {
          /*
           * On success the act has already settled its promise, so this
           * refusal lands on a settled promise and is ignored. Closing
           * without doing it is what this is for.
           */
          zadatak?.calledOff();
          setZadatak(null);
        }}
        title={zadatak?.title ?? ''}
        does={zadatak?.does ?? ''}
        means={zadatak?.means}
        label={zadatak?.title ?? ''}
        perform={async () => {
          await zadatak?.run();
        }}
        onDone={setJustDid}
        after={zadatak?.after}
      />

      <Act
        open={acting === 'concurYes'}
        onClose={() => setActing(null)}
        title={t('snc.recordBreach')}
        does={t('sw.concurYes.does')}
        means={t('sw.concurYes.means')}
        label={t('snc.recordBreach')}
        grave
        reason={{ label: t('sw.concurYes.reason'), help: t('sw.concurYes.reasonHelp') }}
        perform={async ({ reason }) => act(() => oversight.concur(id, true, reason))}
        onDone={setJustDid}
        after={{
          did: t('sw.concurYes.did'),
          means: t('sw.concurYes.didMeans'),
          next: [
            { label: t('sw.next.stopped'), says: t('sw.next.stoppedSays') },
            { label: t('sw.next.purify'), says: t('sw.next.purifySays') },
          ],
        }}
      />

      <Act
        open={acting === 'concurNo'}
        onClose={() => setActing(null)}
        title={t('snc.recordNoBreach')}
        does={t('sw.concurNo.does')}
        means={t('sw.concurNo.means')}
        label={t('snc.recordNoBreach')}
        reason={{ label: t('sw.concurNo.reason'), help: t('sw.concurNo.reasonHelp') }}
        perform={async ({ reason }) => act(() => oversight.concur(id, false, reason))}
        onDone={setJustDid}
        after={{
          did: t('sw.concurNo.did'),
          means: t('sw.concurNo.didMeans'),
          next: [{ label: t('sw.next.close'), says: t('sw.next.closeSays') }],
        }}
      />

      <Act
        open={acting === 'stop'}
        onClose={() => setActing(null)}
        title={t('snc.recordStopped')}
        does={t('sw.stop.does')}
        means={t('sw.stop.means')}
        label={t('snc.recordStopped')}
        reason={{ label: t('sw.stop.reason'), help: t('sw.stop.reasonHelp') }}
        perform={async ({ reason }) =>
          act(() =>
            oversight.stop(
              id,
              reason.split('\n').map((x) => x.trim()).filter(Boolean),
            ),
          )
        }
        onDone={setJustDid}
        after={{
          did: t('sw.stop.did'),
          means: t('sw.stop.didMeans'),
          next: [{ label: t('sw.next.purify'), says: t('sw.next.purifySays') }],
        }}
      />

      <Act
        open={acting === 'endorse'}
        onClose={() => setActing(null)}
        title={t('snc.endorse')}
        does={t('sw.endorse.does')}
        means={t('sw.endorse.means')}
        label={t('snc.endorse')}
        perform={async () => act(() => oversight.endorsePlan(id))}
        onDone={setJustDid}
        after={{
          did: t('sw.endorse.did'),
          means: t('sw.endorse.didMeans'),
          next: [{ label: t('sw.next.directors'), says: t('sw.next.directorsSays') }],
        }}
      />

      <Act
        open={acting === 'returnPlan'}
        onClose={() => setActing(null)}
        title={t('snc.returnPlan')}
        does={t('sw.returnPlan.does')}
        means={t('sw.returnPlan.means')}
        label={t('snc.returnPlan')}
        grave
        reason={{ label: t('sw.returnPlan.reason'), help: t('sw.returnPlan.reasonHelp') }}
        perform={async ({ reason }) => act(() => oversight.returnPlan(id, reason))}
        onDone={setJustDid}
        after={{
          did: t('sw.returnPlan.did'),
          means: t('sw.returnPlan.didMeans'),
          next: [{ label: t('sw.next.plan'), says: t('sw.next.planSays') }],
        }}
      />

      <Act
        open={acting === 'directors'}
        onClose={() => setActing(null)}
        title={t('snc.recordDirectors')}
        does={t('sw.directors.does')}
        means={t('sw.directors.means')}
        label={t('snc.recordDirectors')}
        perform={async () => act(() => oversight.directors(id))}
        onDone={setJustDid}
        after={{
          did: t('sw.directors.did'),
          means: t('sw.directors.didMeans'),
          next: [{ label: t('sw.next.close'), says: t('sw.next.closeSays') }],
        }}
      />

      <Act
        open={acting === 'submission'}
        onClose={() => setActing(null)}
        title={t('snc.recordSubmission')}
        does={t('sw.submission.does')}
        means={t('sw.submission.means')}
        label={t('snc.recordSubmission')}
        perform={async () => act(() => oversight.submission(id))}
        onDone={setJustDid}
        after={{
          did: t('sw.submission.did'),
          means: t('sw.submission.didMeans'),
          next: [{ label: t('sw.next.close'), says: t('sw.next.closeSays') }],
        }}
      />

      <Act
        open={acting === 'paid'}
        onClose={() => setActing(null)}
        title={t('snc.recordPaid')}
        does={t('sw.paid.does')}
        means={t('sw.paid.means')}
        label={t('snc.recordPaid')}
        reason={{ label: t('sw.paid.reason'), help: t('sw.paid.reasonHelp') }}
        perform={async ({ reason }) => act(() => oversight.purificationPaid(id, reason))}
        onDone={setJustDid}
        after={{
          did: t('sw.paid.did'),
          means: t('sw.paid.didMeans'),
          next: [{ label: t('sw.next.close'), says: t('sw.next.closeSays') }],
        }}
      />

      <Act
        open={acting === 'close'}
        onClose={() => setActing(null)}
        title={t('snc.close')}
        does={t('sw.close.does')}
        means={t('sw.close.means')}
        label={t('snc.close')}
        perform={async () => act(() => oversight.closeIncident(id))}
        onDone={setJustDid}
        after={{
          did: t('sw.close.did'),
          means: t('sw.close.didMeans'),
          next: [
            {
              label: t('sw.next.backToBreaches'),
              to: '/incidents',
              says: t('sw.next.backToBreachesSays'),
            },
          ],
        }}
      />
    </>
  );

  return (
    <div>
      {/*
        What the last act did, above the ladder.

        Above it on purpose: an act changes the stage, the stage redraws the
        ladder, and a sentence rendered inside a step would go with it.
      */}
      {justDid && (
        <AfterAct
          did={justDid.did}
          means={justDid.means}
          next={justDid.next}
          onClose={() => setJustDid(null)}
        />
      )}
      {windows}

      <div className="mb-1 font-mono text-note text-muted">{i.reference}</div>
      <h1 className="mb-2 font-display font-normal leading-tight tracking-display text-head sm:text-display">{i.title}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tag tone={i.clock?.overdue ? 'warn' : i.stage === 'closed' ? 'ok' : undefined}>
          {t(`snc.stage.${i.stage}`)}
        </Tag>
        <ClockLine incident={i} />
      </div>

      {i.clock && (
        <p
          className={
            'mb-5 rounded-card px-5 py-4 text-ui leading-relaxed ' +
            (i.clock.overdue
              ? 'bg-breachtint text-breach shadow-ringbreach'
              : 'bg-raised/60 text-muted shadow-ring')
          }
        >
          {i.clock.note}
        </p>
      )}

      <p className="mb-6 text-lead leading-relaxed">{i.report}</p>

      {refusal && (
        <div className="mb-5 rounded-card shadow-ringbreach bg-breachtint px-4 py-3 text-ui leading-relaxed text-breach">
          {refusal}
        </div>
      )}

      <h2 className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
        {t('snc.sequence')}
      </h2>

      <ol className="space-y-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className={
              'grid grid-cols-[28px_1fr] gap-3 rounded-card px-5 py-4 ' +
              (s.current
                ? 'bg-lapistint shadow-pick'
                : s.done
                  ? 'bg-raised shadow-card'
                  : 'bg-raised/60 opacity-70 shadow-ring')
            }
          >
            <div className="pt-0.5 font-mono text-note text-muted tabular-nums">
              {s.done ? '✓' : String(s.n).padStart(2, '0')}
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <span className="text-body font-medium">{s.label}</span>
                <span className="text-label font-bold uppercase tracking-caps text-muted">{mine(s.owner)}</span>
              </div>
              <div className="text-ui leading-relaxed">{s.detail}</div>
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
      <Button onClick={() => setOpen(true)} className="rounded-xl bg-raised shadow-ring px-3 py-1.5 text-ui text-lapis font-medium">
        {t('snc.prescribe')}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {/*
        Named on the screen, not only to a reader of the markup. The
        currency box had nothing at all on it — a three-letter field beside
        a number, which a person can only guess at.
      */}
      <div className="flex gap-2">
        <label className="block">
          <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
            {t('common.amount')}
          </span>
          <input
            value={p.amount}
            onChange={(e) => setP({ ...p, amount: e.target.value })}
            placeholder="12480.55"
            className="w-32 rounded-xl shadow-ring bg-raised px-3 py-2 text-body tabular-nums"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
            {t('common.currency')}
          </span>
          <input
            value={p.currency}
            onChange={(e) => setP({ ...p, currency: e.target.value })}
            className="w-20 rounded-xl shadow-ring bg-raised px-3 py-2 text-body"
          />
        </label>
      </div>
      <input
        value={p.destination}
        onChange={(e) => setP({ ...p, destination: e.target.value })}
        placeholder={t('snc.destinationHint')}
            aria-label={t('snc.destinationHint')}
        className="w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-body"
      />
      <p className="text-note leading-relaxed text-muted">{t('snc.destinationNote')}</p>
      <div className="flex gap-2">
        <Button
          onClick={async () => {
            try {
              await onSubmit(p);
              setOpen(false);
            } catch {
              /* Refused, or called off: the amount and destination stay. */
            }
          }}
          className="rounded-xl bg-raised shadow-ring px-3 py-1.5 text-ui text-lapis font-medium"
        >
          {t('snc.prescribe')}
        </Button>
        <Button onClick={() => setOpen(false)} className="rounded-xl shadow-ring px-3 py-1.5 text-ui text-muted">
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}
