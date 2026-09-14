import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  api,
  oversight,
  Refused,
  type Checklist as ChecklistData,
  type ConditionState,
  type Matter,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { ErrorText, Loading } from '../components/ui.js';
import { State, toneForStatus } from '../components/kit.js';
import StepWindow, { type Step } from '../components/StepWindow.js';
import TheCalculator from '../components/TheCalculator.js';
import AskTheBank from '../components/AskTheBank.js';
import Dialog from '../components/Dialog.js';
import VotePanel from '../components/VotePanel.js';
import SignTheDocument from '../components/SignTheDocument.js';
import { useStillThere } from '../lib/stillThere.js';

/**
 * A question, worked one step at a time, inside a window.
 *
 * ── what the owner asked for, in his words ────────────────────────────────
 *
 * > A question comes in. He opens it, and beside it everything required is
 * > written out, and right below, in the application's style, are all the
 * > tools. He does one, presses, it takes him to the next step, and at the end
 * > the vote.
 *
 * and, of the version before this one:
 *
 * > It looks like a web page, not an application.
 *
 * Both are the same complaint. A column of prose scrolling down a page is a
 * document, and making the document shorter left it a document. An application
 * is a frame that holds still while its contents change: a strip saying where
 * in the run you are, the work in the middle, the question in a pane beside
 * it, and the acts in a bar along the bottom that is always in the same place.
 *
 * ── one step is on the screen ─────────────────────────────────────────────
 *
 * Not one step open among six folded. One step, filling the work area, with
 * the tool it needs inside it. The strip along the top is how a member moves
 * between them and how they see how far through they are.
 *
 * ── and the last stop is the vote ─────────────────────────────────────────
 *
 * It sits in the strip like the others and is reached by answering the ones
 * before it. That is what *at the end the vote* means: not a panel sitting
 * there from the start waiting to be scrolled past.
 */

const SETTLED = ['in_force', 'timelock', 'rejected', 'lapsed', 'withdrawn'];

/** The last stop in the strip. Not a condition, so it carries no id of one. */
const VOTE = 'vote';

export default function MatterFlow() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [matter, setMatter] = useState<Matter | null>(null);
  const [list, setList] = useState<ChecklistData | null>(null);
  const [failed, setFailed] = useState(false);
  const there = useStillThere();

  /** Which stop is on the screen. A condition id, or the vote. */
  const [at, setAt] = useState<string | null>(null);

  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  /**
   * Which act is being confirmed, if any.
   *
   * An act that reaches outside this screen opens a window first: it says
   * what is about to happen and to whom, the member writes the reason, and
   * then it happens. A finding recorded because somebody pressed a word in
   * a bar is a finding nobody can defend afterwards.
   */
  const [confirming, setConfirming] = useState<'not_met' | 'not_applicable' | null>(null);

  function load() {
    if (!id) return;
    api
      .matter(id)
      .then((m) => {
        if (m && Array.isArray(m.notDecided)) {
          there.arrived();
          setMatter(m);
        } else {
          there.lost(setFailed);
        }
      })
      .catch(() => there.lost(setFailed));

    /*
     * The steps. A matter judged against no shape has none, and that is an
     * ordinary state rather than an error: the board then argues and votes,
     * which is the whole of what a board did before shapes existed.
     */
    oversight
      .checklist(id)
      .then(setList)
      .catch(() => setList(null));
  }

  useEffect(load, [id]);

  if (failed) return <ErrorText />;
  if (!matter) return <Loading />;

  const settled = SETTLED.includes(matter.status);
  const conditions: ConditionState[] = list?.conditions ?? [];
  const mine = identity?.scholarId;
  const canRule = identity?.role !== 'observer';

  const answered = (c: ConditionState) => (c.answeredBy?.length ?? 0) > 0;
  const outstanding = conditions.filter((c) => !answered(c)).length;

  /*
   * Where to be, when nobody has said.
   *
   * The first step with no answer, or the vote once they all have one. A
   * member who opens a matter they are halfway through lands where they left
   * off rather than at the top.
   */
  const firstOpen = conditions.find((c) => !answered(c));
  const here = at ?? firstOpen?.condition.id ?? VOTE;
  const step = conditions.find((c) => c.condition.id === here) ?? null;
  const onVote = here === VOTE;

  const strip: Step[] = [
    ...conditions.map((c, i) => ({
      id: c.condition.id,
      ordinal: String(i + 1).padStart(2, '0'),
      state: (list?.contested?.includes(c.condition.id)
        ? 'contested'
        : c.condition.id === here
          ? 'here'
          : answered(c)
            ? 'done'
            : 'todo') as Step['state'],
      onOpen: () => {
        setAt(c.condition.id);
        setRefusal(null);
        setWhy('');
      },
    })),
    {
      id: VOTE,
      ordinal: t('win.voteShort'),
      state: (onVote ? 'here' : 'todo') as Step['state'],
      onOpen: () => {
        setAt(VOTE);
        setRefusal(null);
      },
    },
  ];

  /** Record this member's finding, then move to the next step with no answer. */
  async function record(holds: 'met' | 'not_met' | 'not_applicable') {
    if (!step || !matter || busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      const updated = await oversight.recordFinding(matter.id, {
        conditionId: step.condition.id,
        holds,
        reason: why.trim(),
      });
      setMatter(updated);
      setWhy('');

      const fresh = await oversight.checklist(matter.id);
      setList(fresh);

      const next = fresh.conditions.find(
        (c) => c.condition.id !== step.condition.id && (c.answeredBy?.length ?? 0) === 0,
      );
      setAt(next ? next.condition.id : VOTE);
    } catch (e) {
      setRefusal(e instanceof Refused ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // ── the pane beside the work, which does not change ────────────────────

  const aside = (
    <>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('flow.theQuestion')}
      </div>
      <p className="mb-5 font-display text-[14px] leading-[1.55] text-paper">{matter.proposal}</p>

      {matter.notDecided.length > 0 && (
        <>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('matter.notDecided')}
          </div>
          <ul className="mb-5 space-y-1.5">
            {matter.notDecided.map((n, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-[1.5] text-sand">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {list?.structure && (
        <>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('sent.judgedAs')}
          </div>
          <p className="mb-5 text-[12.5px] leading-[1.5] text-sand">{list.structure.name}</p>
        </>
      )}

      <Link
        to={`/dossier/matters/${matter.id}`}
        className="text-[12px] text-lapis underline decoration-line underline-offset-4"
      >
        {t('flow.everythingElse')}
      </Link>
    </>
  );

  const chips = (
    <>
      <State tone={matter.direction === 'restrict' ? 'breach' : 'settled'}>
        {t(`matter.direction.${matter.direction}`)}
      </State>
      <State tone={toneForStatus(matter.status)}>{t(`matter.status.${matter.status}`)}</State>
    </>
  );

  // ── a decided matter is not a run of steps ─────────────────────────────

  if (settled) {
    return (
      <StepWindow
        title={matter.title}
        chips={chips}
        steps={[]}
        heading={t('flow.decided')}
        aside={aside}
        acts={
          <Link
            to={`/dossier/matters/${matter.id}`}
            className="rounded-xl bg-raised px-4 py-2 text-[12.5px] font-semibold text-lapis shadow-ring"
          >
            {t('flow.everythingElse')}
          </Link>
        }
      >
        <SignTheDocument matter={matter} />
      </StepWindow>
    );
  }

  // ── the vote, as the last stop ─────────────────────────────────────────

  if (onVote || conditions.length === 0) {
    return (
      <StepWindow
        title={matter.title}
        chips={chips}
        steps={conditions.length > 0 ? strip : []}
        heading={t('win.theVote')}
        aside={aside}
        acts={
          outstanding > 0 ? (
            <button
              type="button"
              onClick={() => setAt(firstOpen?.condition.id ?? null)}
              className="rounded-xl bg-lapis px-5 py-2.5 text-[13px] font-semibold text-white shadow-act"
            >
              {t('win.backToSteps')}
            </button>
          ) : null
        }
      >
        <VotePanel
          stepsOutstanding={outstanding}
          matter={matter}
          role={identity?.role}
          scholarId={identity?.scholarId}
          onChanged={(m) => {
            setMatter(m);
            load();
          }}
        />
      </StepWindow>
    );
  }

  // ── one step ───────────────────────────────────────────────────────────

  const n = conditions.findIndex((c) => c.condition.id === here) + 1;
  const already = step?.finding ?? null;
  const said = (step?.history ?? []).filter((f) => f.scholarId !== mine);

  return (
    <StepWindow
      title={matter.title}
      chips={chips}
      steps={strip}
      heading={`${t('win.step')} ${n} ${t('win.of')} ${conditions.length}`}
      aside={aside}
      /*
       * What each button in the bar will cause, before it is pressed.
       *
       * Not a tooltip. A member recording *not met* is putting a clause into
       * the draft the bank receives, with a line saying the agreement must
       * provide for it; one recording *does not apply* is drafting no clause
       * at all. Those are different outcomes for the institution and the
       * screen said neither.
       */
      consequences={
        canRule ? (
          <p className="max-w-[76ch] text-[11.5px] leading-[1.6] text-muted">
            {t('win.whatTheseDo')}
          </p>
        ) : null
      }
      acts={
        <>
          {refusal && (
            <span className="me-auto text-[12.5px] leading-[1.5] text-breach">{refusal}</span>
          )}
          {canRule && (
            <>
              <button
                type="button"
                onClick={() => setConfirming('not_applicable')}
                disabled={busy}
                className="rounded-xl bg-raised px-4 py-2.5 text-[12.5px] font-semibold text-sand shadow-ring disabled:opacity-50"
              >
                {t('win.setAside')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming('not_met')}
                disabled={busy}
                className="rounded-xl bg-raised px-4 py-2.5 text-[12.5px] font-semibold text-breach shadow-ring disabled:opacity-50"
              >
                {t('win.notMet')}
              </button>
              <button
                type="button"
                onClick={() => void record('met')}
                disabled={busy}
                className="rounded-xl bg-lapis px-5 py-2.5 text-[13px] font-semibold text-white shadow-act disabled:opacity-50"
              >
                {busy ? t('common.loading') : t('win.metAndOn')}
              </button>
            </>
          )}
        </>
      }
    >
      {step && (
        <>
          <p className="mb-4 max-w-[62ch] font-display text-[17px] leading-[1.5] text-paper">
            {step.condition.requirement}
          </p>

          <p className="mb-5 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
            {step.condition.why}
          </p>

          {/*
            The tool for this step, inside it.

            Which calculator is decided by what the shape names, never guessed
            from the wording of the condition — see TheCalculator.
          */}
          {step.condition.evidence === 'figure' && (
            <div className="mb-5">
              <TheCalculator
                matterId={matter.id}
                conditionId={step.condition.id}
                /* Which calculators this shape attracts. Named by the shape,
                   never inferred from the wording of the condition. */
                offered={list?.structure?.calculations ?? []}
                onWorked={load}
              />
            </div>
          )}

          {/*
            Where this member found it not met, the thing that follows is
            telling the bank what has to change.

            The draft opens with the condition already in it. It is not sent
            by the software and it is not written by it: a requirement the
            institution must answer carries a member's name, and the member
            is the author of it.
          */}
          {already?.holds === 'not_met' && (
            <div className="mb-5 rounded-card bg-[#FCF6EC] px-4 py-3.5 shadow-ring">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gold">
                {t('win.notMetNext')}
              </div>
              <p className="mb-3 max-w-[62ch] text-[12.5px] leading-[1.6] text-sand">
                {t('win.notMetMeans')}
              </p>
              <AskTheBank
                matterId={matter.id}
                conditionId={step.condition.id}
                requirement={step.condition.requirement}
                asked={(matter.asked ?? []).filter((q) => q.conditionId === step.condition.id)}
                canAsk={canRule}
                onAsked={load}
              />
            </div>
          )}

          {/* What this member already said, if anything. */}
          {already && (
            <p className="mb-4 rounded-card bg-ink px-4 py-3 text-[12.5px] leading-[1.6] text-sand">
              {t(`chk.${already.holds}`)}
              {already.reason ? ` — ${already.reason}` : ''}
            </p>
          )}

          {/* And what colleagues said, because a step they disagree on matters. */}
          {said.length > 0 && (
            <div className="mb-5">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                {t('win.othersSaid')}
              </div>
              <ul className="space-y-1.5">
                {said.slice(0, 4).map((f, i) => (
                  <li key={i} className="text-[12.5px] leading-[1.5] text-sand">
                    <span className="font-semibold">{f.scholarId}</span> —{' '}
                    {t(`chk.${f.holds}`)}
                    {f.reason ? `: ${f.reason}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canRule && (
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                {t('win.why')}
              </span>
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                rows={3}
                placeholder={t('win.whyHint')}
                className="w-full rounded-xl bg-ink px-4 py-3 text-[13.5px] leading-[1.6] text-paper shadow-ring outline-none placeholder:text-muted focus:shadow-lift"
              />
            </label>
          )}
        </>
      )}

      {/*
        The window that opens on an act with a consequence.

        It says what the finding does — which for *not met* is a clause in
        the draft the bank receives, with a line saying the agreement must
        provide for it — and it takes the reason before recording anything.
      */}
      <Dialog
        open={confirming !== null}
        title={t(confirming === 'not_met' ? 'ask.notMetTitle' : 'ask.notApplyTitle')}
        onClose={() => setConfirming(null)}
        acts={
          <>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="text-[12.5px] text-muted underline decoration-line underline-offset-4"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={busy || why.trim().length === 0}
              onClick={() => {
                const holds = confirming;
                if (!holds) return;
                setConfirming(null);
                void record(holds);
              }}
              className="rounded-xl bg-lapis px-5 py-2.5 text-[13px] font-semibold text-white shadow-act disabled:opacity-40"
            >
              {t(confirming === 'not_met' ? 'ask.notMetDo' : 'ask.notApplyDo')}
            </button>
          </>
        }
      >
        <p className="mb-4 max-w-[58ch] text-[13.5px] leading-[1.65] text-sand">
          {t(confirming === 'not_met' ? 'ask.notMetMeans' : 'ask.notApplyMeans')}
        </p>

        {step && (
          <p className="mb-4 rounded-card bg-ink px-4 py-3 font-display text-[14px] leading-[1.5] text-paper">
            {step.condition.requirement}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t(confirming === 'not_met' ? 'ask.notMetWhy' : 'ask.notApplyWhy')}
          </span>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={4}
            placeholder={t('win.whyHint')}
            className="w-full rounded-xl bg-ink px-4 py-3 text-[13.5px] leading-[1.6] text-paper shadow-ring outline-none placeholder:text-muted focus:shadow-lift"
          />
        </label>

        <p className="mt-3 max-w-[58ch] text-[12px] leading-[1.6] text-muted">
          {t('ask.reasonIsRequired')}
        </p>
      </Dialog>
    </StepWindow>
  );
}
