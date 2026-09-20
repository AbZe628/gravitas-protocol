import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  aKeyForThisPress,
  api,
  oversight,
  Refused,
  type Delivery,
  type Notice,
  type Checklist as ChecklistData,
  type ConditionState,
  type Matter,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { ErrorText, Loading } from '../components/ui.js';
import { State, toneForStatus } from '../components/kit.js';
import ItMoved from '../components/ItMoved.js';
import AfterAct from '../components/AfterAct.js';
import { DocumentLink } from '../components/Documents.js';
import TheNotice from '../components/TheNotice.js';
import StepWindow, { type Step } from '../components/StepWindow.js';
import TheCalculator from '../components/TheCalculator.js';
import AskTheBank from '../components/AskTheBank.js';
import WhatTheySent from '../components/WhatTheySent.js';
import Deliberation from '../components/Deliberation.js';
import Evidence from '../components/Evidence.js';
import { useHealth } from '../lib/health.js';
import Dialog from '../components/Dialog.js';
import VotePanel from '../components/VotePanel.js';
import SignTheDocument from '../components/SignTheDocument.js';
import { useStillThere } from '../lib/stillThere.js';
import { Button } from '../components/Button';

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

/**
 * The first stop: what arrived and what the work will be.
 *
 * It was built, the owner saw it, and I dropped it when this screen was
 * rewritten as a window — a regression, and the kind that is only found by
 * somebody reading the file. It is a stop in the strip now rather than a
 * separate screen, which is where it belonged in the first place.
 */
const BRIEF = 'brief';

export default function MatterFlow() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { identity } = useIdentity();
  const health = useHealth();

  const [matter, setMatter] = useState<Matter | null>(null);
  const [list, setList] = useState<ChecklistData | null>(null);
  /** The shape was asked for and did not come — not the same as having none. */
  const [listLost, setListLost] = useState(false);
  /*
   * The words the board is told when the ruling takes force.
   *
   * Held by the page for the same reason as `justDid`: closing the vote
   * changes the status, the screen takes a different branch, and the panel
   * that received these would be unmounted before anybody read them.
   */
  const [told, setTold] = useState<{ notice: Notice; delivery: Delivery } | null>(null);
  const [failed, setFailed] = useState(false);
  const there = useStillThere();

  /**
   * Which stop is on the screen — in the address, not only in memory.
   *
   * `?step=<id>` rather than a number nobody outside this component can see.
   * Three things follow, all three listed in §11.1 as missing: reloading
   * returns to the step the member was on rather than the first unanswered
   * one, the browser's own back and forward move between steps, and a member
   * can send a colleague the step rather than the matter.
   */
  const [params, setParams] = useSearchParams();
  const at = params.get('step');
  const goTo = (stop: string) => {
    /*
     * Replaced rather than pushed, so `back` leaves the matter rather than
     * walking back through every step the member happened to look at. The
     * strip is how you move between steps; back is how you leave.
     */
    const next = new URLSearchParams(params);
    next.set('step', stop);
    setParams(next, { replace: true });
  };

  /**
   * What the member has typed, kept per step while they are on this matter.
   *
   * It was one box, cleared on every move: looking at step 4 to check
   * something and coming back to step 2 threw away the sentence they were
   * halfway through. §11.2 — *otkucano se ne gubi*. The reason is the part of
   * a finding that takes thought, so losing it is losing the work.
   */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
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

  /** Which copy of the matter this member is looking at. Sent with every act. */
  const [version, setVersion] = useState<string | null>(null);
  /** Open when somebody wrote while this member was writing. See N-04. */
  const [itMoved, setItMoved] = useState(false);
  /**
   * The matter as it stands now, read only to show what arrived.
   *
   * Kept apart from the matter on the screen on purpose. The member has not
   * decided yet, and replacing what they are looking at would decide for
   * them — they would come back from the window to a screen that had moved.
   */
  const [whatArrived, setWhatArrived] = useState<Matter | null>(null);
  /**
   * What the last act did, and what may follow from it.
   *
   * Held here rather than inside the panel that performed it. Most acts change
   * the status, and this screen shows a different panel at a different status
   * — so the panel is unmounted the moment the act lands, taking the sentence
   * with it. Proved in the browser: withdrawing a matter worked and said
   * nothing at all afterwards.
   */
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);
  /*
   * One key per press, held across retries.
   *
   * A key minted inside the request would be new on every retry and would
   * guard nothing — the whole point is that the same intention carries the
   * same key however many times it is sent.
   */
  const pressKey = useRef<string | null>(null);

  function load() {
    if (!id) return;
    api
      .matterToWorkOn(id)
      .then(({ it: m, version: v }) => {
        if (m && Array.isArray(m.notDecided)) {
          there.arrived();
          setMatter(m);
          setVersion(v);
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
    /*
     * But a shape that could not be READ is not a matter without a shape.
     *
     * Both used to become `null`. Measured with the checklist endpoint
     * failing: the step strip vanished, the work pane went blank, and the
     * screen said nothing — indistinguishable from a matter the board
     * argues and votes on directly. The two are opposite facts.
     */
    oversight
      .checklist(id)
      .then((l) => {
        setList(l);
        setListLost(false);
      })
      .catch(() => {
        setList(null);
        setListLost(true);
      });
  }

  /**
   * The keyboard, bound once and above every early return.
   *
   * A hook below `if (!matter) return <Loading />` runs on some renders and
   * not others, and React counts hooks: the screen then throws *rendered more
   * hooks than during the previous render* and takes the whole matter with it.
   * This repository has had exactly that fault before, in `StructureDetail`.
   *
   * So the listener is attached here, where it is attached on every render,
   * and what it *does* is read from a handle filled in further down — after
   * the step, the strip and the draft exist.
   */
  const keys = useRef<((e: KeyboardEvent) => void) | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current?.(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  /* The same two names as before, now holding one draft per step. */
  const why = drafts[here] ?? '';
  const setWhy = (said: string) => setDrafts((had) => ({ ...had, [here]: said }));

  const strip: Step[] = [
    {
      id: BRIEF,
      ordinal: t('win.briefShort'),
      state: (here === BRIEF ? 'here' : 'done') as Step['state'],
      onOpen: () => {
        goTo(BRIEF);
        setRefusal(null);
      },
    },
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
        goTo(c.condition.id);
        setRefusal(null);
        /* The reason stays: moving away and back must not lose it. §11.2 */
      },
    })),
    {
      id: VOTE,
      ordinal: t('win.voteShort'),
      state: (onVote ? 'here' : 'todo') as Step['state'],
      onOpen: () => {
        goTo(VOTE);
        setRefusal(null);
      },
    },
  ];

  /** Record this member's finding, then move to the next step with no answer. */
  async function record(holds: 'met' | 'not_met' | 'not_applicable') {
    if (!step || !matter || busy) return;
    setBusy(true);
    setRefusal(null);

    /*
     * One key for this press, and the version the member was looking at.
     *
     * The key is minted here rather than inside the request so that a retry of
     * *this press* carries *this key* — a key made per request would change on
     * every retry and guard nothing. The version is what lets the server
     * refuse a finding written without having seen a colleague's.
     */
    const press = pressKey.current ?? (pressKey.current = aKeyForThisPress());

    try {
      const updated = await oversight.recordFinding(
        matter.id,
        {
          conditionId: step.condition.id,
          holds,
          reason: why.trim(),
        },
        { version: version ?? undefined, once: press },
      );
      pressKey.current = null;
      setMatter(updated);
      setWhy('');

      const fresh = await oversight.checklist(matter.id);
      setList(fresh);

      const next = fresh.conditions.find(
        (c) => c.condition.id !== step.condition.id && (c.answeredBy?.length ?? 0) === 0,
      );
      goTo(next ? next.condition.id : VOTE);
    } catch (e) {
      /*
       * Somebody wrote while this member was writing. Not an error to apologise
       * for — a thing that happened, which they now have to decide about. The
       * window shows both; the box behind it keeps what they typed.
       *
       * The key is deliberately *not* cleared here. Whatever they choose next
       * is a retry of this same press, and it must carry the same key or a
       * slow network would let the same finding land twice.
       */
      if (e instanceof Refused && e.code === 'moved_underneath') {
        setItMoved(true);
        /*
         * Fetch what arrived, so the window can show it.
         *
         * Into its own state, and **not** into the matter on the screen: the
         * member has not decided yet, and quietly replacing what they are
         * looking at would answer the question for them. The version is not
         * taken either — accepting it here would mean the next press went
         * through as though they had read something they had not.
         *
         * The first attempt read the last entry off the copy the browser was
         * already holding, which by definition does not contain what arrived.
         * The window said *something changed, open it to see what* — which is
         * exactly the uselessness it exists to prevent. Found by running it.
         */
        api
          .matter(matter.id)
          .then(setWhatArrived)
          .catch(() => setWhatArrived(null));
        return;
      }
      setRefusal(e instanceof Refused ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

/**
 * What arrived while this member was writing, in the record's own words.
 *
 * The fresh copy against the one the browser was holding: whatever is in the
 * first and not the second is what appeared. Falling back to the last thing
 * said covers the case where the change was not a word at all — a finding, a
 * vote — and the window then says plainly that it cannot name it rather than
 * guessing.
 */
function lastSaid(
  fresh: Matter | null,
  held: Matter,
  someone: string,
): { who: string; what: string } | null {
  if (!fresh) return null;
  const had = new Set(held.deliberation.map((d) => d.id));
  const arrived = fresh.deliberation.filter((d) => !had.has(d.id));
  const said = arrived[arrived.length - 1] ?? fresh.deliberation[fresh.deliberation.length - 1];
  if (!said) return null;
  return { who: said.scholarId || someone, what: said.body };
}

  /** Read it again, keeping what was typed, and try the same press once more. */
  async function lookThenDecide() {
    if (!matter) return;
    setItMoved(false);
    setWhatArrived(null);
    const fresh = await api.matterToWorkOn(matter.id);
    setMatter(fresh.it);
    setVersion(fresh.version);
    const list = await oversight.checklist(matter.id);
    setList(list);
  }

  // ── the pane beside the work, which does not change ────────────────────

  /**
   * The keys this step advertises, doing what they say.
   *
   * ── the fault this closes, and it was mine ────────────────────────────────
   *
   * `Keys.tsx` lists `1`, `2`, `3` and the arrows on a step, and says in its
   * own comment that *nothing is listed that does not work on this screen — a
   * shortcut that is advertised and does nothing is worse than one never
   * mentioned.* It listed all five and none of them worked. A sheet that lies
   * about the keyboard is worse than no sheet, because a member who tries one
   * and gets nothing stops trusting the rest.
   *
   * ── never taken out of a box ──────────────────────────────────────────────
   *
   * A member writing *1 of 3 vehicles* in the reason must get the character,
   * not a recorded finding. Every one of these is refused while the cursor is
   * in a box, which is why the arrows are here and not on the window: moving
   * the caret inside a sentence is what arrows are for.
   */
  keys.current = (e: KeyboardEvent) => {
    {
      const inABox =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));
      if (inABox || e.ctrlKey || e.metaKey || e.altKey) return;

      /*
       * A window is open over this. It owns the keyboard until it closes.
       *
       * Read from this screen's own state rather than by looking for a dialog
       * in the page. A DOM query happens to be right today and stops being
       * right the moment anything else on the screen uses that role — and the
       * failure is silent: every key quietly stops working and nobody can say
       * why. What is on the screen is something this component already knows.
       */
      if (confirming !== null || itMoved) return;

      const stops = strip.map((s) => s.id);
      const mine = stops.indexOf(here);

      if (e.key === 'ArrowLeft' && mine > 0) {
        e.preventDefault();
        goTo(stops[mine - 1]);
        return;
      }
      if (e.key === 'ArrowRight' && mine >= 0 && mine < stops.length - 1) {
        e.preventDefault();
        goTo(stops[mine + 1]);
        return;
      }

      /* The three findings, and only where a finding is what this step takes. */
      if (!step || !canRule || settled) return;
      if (e.key === '1') {
        e.preventDefault();
        if (why.trim()) void record('met');
      } else if (e.key === '2') {
        e.preventDefault();
        setConfirming('not_met');
      } else if (e.key === '3') {
        e.preventDefault();
        setConfirming('not_applicable');
      }
    }
  };

  const aside = (
    <>
      <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
        {t('flow.theQuestion')}
      </div>
      <p className="mb-5 font-display text-body leading-relaxed text-paper">{matter.proposal}</p>

      {matter.notDecided.length > 0 && (
        <>
          <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
            {t('matter.notDecided')}
          </div>
          <ul className="mb-5 space-y-1.5">
            {matter.notDecided.map((n, i) => (
              <li key={i} className="flex gap-2 text-ui leading-snug text-sand">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {list?.structure && (
        <>
          <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
            {t('sent.judgedAs')}
          </div>
          <p className="mb-5 text-ui leading-snug text-sand">{list.structure.name}</p>
        </>
      )}

      {/*
        Once, not twice.

        This sentence stood here in the aside and again as the act at the foot
        of the settled window — the same words, a hand's width apart, one of
        them quiet and one of them the main control. Caught by looking at what
        the screen actually says rather than at what the code does. The act bar
        keeps it, because that is where a member looks for something to press.
      */}
    </>
  );

  /**
   * The pane beside the work, as three named parts.
   *
   * What the step asks, what the board has already said, and the document it
   * rests on. Stacked they are a column to scroll; named they are a place to
   * look. The count on *what was said* is how a member knows there is
   * something there without opening it.
   */
  /*
   * What this board cannot do to this matter, and what each costs.
   *
   * Only the ones that apply here. Ratification is named on a restriction
   * in force and nowhere else, because on a permit it would be a shortfall
   * that could never bite.
   */
  const cannot = [
    t('own.recusal'),
    t('own.changeVote'),
    ...(matter.structureId ? [t('own.findingWhileVoting')] : []),
    ...(matter.direction === 'restrict' && matter.status === 'in_force'
      ? [t('own.ratify')]
      : []),
  ];

  const panes = [
    { id: 'guidance', label: t('flow.paneGuidance'), body: aside },
    {
      id: 'said',
      label: t('flow.paneSaid'),
      count: matter.deliberation?.length ?? 0,
      body: (
        <Deliberation
          matter={matter}
          canSpeak={canRule && !settled}
          onChanged={(m) => {
            setMatter(m);
            load();
          }}
        />
      ),
    },
    {
      id: 'sources',
      label: t('flow.paneSources'),
      count: matter.sources?.length ?? 0,
      body: (
        <Evidence
          matter={matter}
          scholarId={identity?.scholarId}
          canAttach={canRule && !settled}
          onChanged={(m) => {
            setMatter(m);
            load();
          }}
        />
      ),
    },
    /*
     * A fourth pane: what cannot be done to this matter. §FAZA 9.
     *
     * ── why here and not in the work pane ──────────────────────────────
     *
     * These are shortfalls the owner has to rule on, and until he does they
     * stay written rather than left silent. But the work pane is measured
     * — §35.5 holds it to 150 words, and it sits at 53 — so putting six
     * paragraphs there would trade one standard for another.
     *
     * The pane beside the work is where reference material already lives
     * and it scrolls on its own. A member who wonders *can I stand aside
     * from this one* looks beside the matter, not in the step.
     *
     * ── each says what it costs, not that it is missing ────────────────
     *
     * Ratification is the sharpest: the act is in the software, no route
     * reaches it, nothing records it — so every restriction lapses and the
     * calendar counts down to a deadline against a thing nobody can do.
     */
    {
      id: 'cannot',
      label: t('flow.paneCannot'),
      count: cannot.length,
      body: (
        <ul className="space-y-4">
          {cannot.map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-gold/70" />
              <span className="max-w-[62ch] text-ui leading-relaxed text-sand">{line}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];


  const chips = (
    <>
      <State tone={matter.direction === 'restrict' ? 'breach' : 'settled'}>
        {t(`matter.direction.${matter.direction}`)}
      </State>
      <State tone={toneForStatus(matter.status)}>{t(`matter.status.${matter.status}`)}</State>
    </>
  );

  /*
   * What the last act did, above the work and outside every panel.
   *
   * Worked out before the branch below, so it survives the screen changing
   * shape underneath it — which is exactly what the act it reports just did.
   */
  /*
   * What this screen could not read, said where the work is.
   *
   * Sits beside `didPanel` in every branch, because a member who cannot see
   * the steps needs to know the difference between *this matter has none*
   * and *the steps did not come*. The first is a matter argued and voted
   * directly; the second is an incomplete screen.
   */
  const gapPanel = listLost ? (
    <div
      role="alert"
      className="mb-5 rounded-card bg-raised px-5 py-4 shadow-ring"
    >
      <div className="text-label font-bold uppercase tracking-caps text-muted">
        {t('flow.stepsLost')}
      </div>
      <p className="mt-2 max-w-[62ch] text-body leading-relaxed text-sand">
        {t('flow.stepsLostMeans')}
      </p>
    </div>
  ) : null;

  const didPanel = justDid ? (
    <AfterAct
      did={justDid.did}
      means={justDid.means}
      next={justDid.next}
      onClose={() => setJustDid(null)}
    />
  ) : null;

  // ── a decided matter is not a run of steps ─────────────────────────────

  if (settled) {
    return (
      <StepWindow
        title={matter.title}
        chips={chips}
        steps={[]}
        heading={t('flow.decided')}
        asidePanes={panes}
        acts={
          <Link
            to={`/dossier/matters/${matter.id}`}
            className="rounded-xl bg-raised px-4 py-2 text-ui font-semibold text-lapis shadow-ring"
          >
            {t('flow.everythingElse')}
          </Link>
        }
      >
        {gapPanel}
        {didPanel}

        {/*
          The papers, where the decision landed.

          §FAZA 7: from the vote closing to a finished paper, no click. The
          papers were finished all along — the routes assemble them on
          request and both answer 200 the moment a ruling takes force — but
          they were only reachable through the dossier, so a chair who had
          just closed a vote had to go looking for the thing the closing
          produced. Offered here, beside the signing, because this is the
          screen the act left them on.

          Read rather than sent: §11.9 draws that line, and it holds. The
          paper assembles itself; a person decides it goes.
        */}
        {/*
          What the board was told, and whether it went anywhere.

          Beside the papers rather than in a mailbox nobody opens. The
          ordinary installation has no channel, so this says plainly that
          the words exist and were not sent — which is the prompt for a
          person to send them. A quiet screen here would let a chair believe
          the institution had been told.
        */}
        {told && (
          <div className="mb-6">
            <TheNotice notice={told.notice} delivery={told.delivery} />
          </div>
        )}

        {matter.status === 'in_force' && (
          <section className="mb-6">
            <div className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
              {t('flow.papers')}
            </div>
            <div className="space-y-2.5">
              <DocumentLink
                href={oversight.hrefs.fatwa(matter.id)}
                label={t('doc.fatwa')}
                note={t('doc.fatwaNote')}
                emphasis
              />
              {/*
                Clauses only where the matter was judged against a shape.
                With no shape there is nothing to draft from, and a link
                that leads to an empty paper is a link that lied.
              */}
              {conditions.length > 0 && (
                <DocumentLink
                  href={oversight.hrefs.contract(matter.id)}
                  label={t('doc.contract')}
                  note={t('doc.contractNote')}
                />
              )}
            </div>
          </section>
        )}

        <SignTheDocument matter={matter} />
      </StepWindow>
    );
  }

  // ── the briefing, as the first stop ────────────────────────────────────

  if (here === BRIEF) {
    return (
      <StepWindow
        title={matter.title}
        chips={chips}
        steps={strip}
        heading={t('sent.title')}
        asidePanes={panes}
        acts={
          <Button
            type="button"
            onClick={() => goTo(firstOpen?.condition.id ?? VOTE)}
            className="rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act"
          >
            {t('sent.understood')}
          </Button>
        }
      >
        {gapPanel}
        {didPanel}
        <WhatTheySent
          matter={matter}
          list={list}
          assistantOn={health?.assistantKind !== 'off' && health?.assistantKind !== undefined}
          onStart={() => goTo(firstOpen?.condition.id ?? VOTE)}
        />
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
        asidePanes={panes}
        acts={
          outstanding > 0 ? (
            <Button
              type="button"
              onClick={() => goTo(firstOpen?.condition.id ?? VOTE)}
              className="rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act"
            >
              {t('win.backToSteps')}
            </Button>
          ) : null
        }
      >
        {gapPanel}
        {didPanel}
        <VotePanel
          stepsOutstanding={outstanding}
          matter={matter}
          role={identity?.role}
          scholarId={identity?.scholarId}
          onChanged={(m) => {
            setMatter(m);
            load();
          }}
          onDid={setJustDid}
          onTold={setTold}
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
      asidePanes={panes}
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
          <p className="max-w-[76ch] text-note leading-relaxed text-muted">
            {t('win.whatTheseDo')}
            {why.trim().length === 0 ? ' ' + t('win.needAReason') : ''}
          </p>
        ) : null
      }
      acts={
        <>
          {refusal && (
            <span className="me-auto text-ui leading-snug text-breach">{refusal}</span>
          )}
          {canRule && (
            <>
              <Button
                tone="quiet"
                size="md"
                hint="3"
                onClick={() => setConfirming('not_applicable')}
                disabled={busy}
              >
                {t('win.setAside')}
              </Button>
              <Button
                tone="grave"
                size="md"
                hint="2"
                onClick={() => setConfirming('not_met')}
                disabled={busy}
              >
                {t('win.notMet')}
              </Button>
              {/*
                Dead until there is a reason, because the server requires one
                and refuses without it.

                It was live, sent an empty reason, took a 400, and printed the
                refusal as small text at the far end of the bar — which reads
                as the button doing nothing. A control that cannot be honoured
                is absent or dead, never live and then sorry.
              */}
              <Button
                tone="act"
                size="md"
                hint="1"
                onClick={() => void record('met')}
                busy={busy}
                disabled={why.trim().length === 0}
                whyDead={why.trim().length === 0 ? t('ask.reasonIsRequired') : undefined}
              >
                {t('win.metAndOn')}
              </Button>
            </>
          )}
        </>
      }
    >
      {gapPanel}
        {didPanel}
      {step && (
        <>
          <p className="mb-4 max-w-[62ch] font-display text-sub leading-snug text-paper">
            {step.condition.requirement}
          </p>

          <p className="mb-5 max-w-[62ch] text-ui leading-relaxed text-muted">
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
              <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-gold">
                {t('win.notMetNext')}
              </div>
              <p className="mb-3 max-w-[62ch] text-ui leading-relaxed text-sand">
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
            <p className="mb-4 rounded-card bg-ink px-4 py-3 text-ui leading-relaxed text-sand">
              {t(`chk.${already.holds}`)}
              {already.reason ? ` — ${already.reason}` : ''}
            </p>
          )}

          {/* And what colleagues said, because a step they disagree on matters. */}
          {said.length > 0 && (
            <div className="mb-5">
              <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
                {t('win.othersSaid')}
              </div>
              <ul className="space-y-1.5">
                {said.slice(0, 4).map((f, i) => (
                  <li key={i} className="text-ui leading-snug text-sand">
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
              <span className="mb-1.5 block text-label font-bold uppercase tracking-caps text-muted">
                {t('win.why')}
              </span>
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                rows={3}
                placeholder={t('win.whyHint')}
                className="w-full rounded-xl bg-ink px-4 py-3 text-body leading-relaxed text-paper shadow-ring outline-none placeholder:text-muted focus:shadow-lift"
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
            <Button
              type="button"
              onClick={() => setConfirming(null)}
              className="text-ui text-muted underline decoration-line underline-offset-4"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              disabled={busy || why.trim().length === 0}
              onClick={() => {
                const holds = confirming;
                if (!holds) return;
                setConfirming(null);
                void record(holds);
              }}
              className="rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act disabled:opacity-40"
            >
              {t(confirming === 'not_met' ? 'ask.notMetDo' : 'ask.notApplyDo')}
            </Button>
          </>
        }
      >
        <p className="mb-4 max-w-[58ch] text-body leading-relaxed text-sand">
          {t(confirming === 'not_met' ? 'ask.notMetMeans' : 'ask.notApplyMeans')}
        </p>

        {step && (
          <p className="mb-4 rounded-card bg-ink px-4 py-3 font-display text-body leading-snug text-paper">
            {step.condition.requirement}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-label font-bold uppercase tracking-caps text-muted">
            {t(confirming === 'not_met' ? 'ask.notMetWhy' : 'ask.notApplyWhy')}
          </span>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={4}
            placeholder={t('win.whyHint')}
            className="w-full rounded-xl bg-ink px-4 py-3 text-body leading-relaxed text-paper shadow-ring outline-none placeholder:text-muted focus:shadow-lift"
          />
        </label>

        <p className="mt-3 max-w-[58ch] text-note leading-relaxed text-muted">
          {t('ask.reasonIsRequired')}
        </p>
      </Dialog>

      {/*
        Somebody wrote while this member was writing. N-04.

        `theirs` is the last thing said on the matter as it stands now, which
        is what arrived while they were typing in the ordinary case. Where the
        change was something else — a finding, a vote — the window says so
        plainly rather than guessing, and the member reads it for themselves.
      */}
      <ItMoved
        open={itMoved}
        theirs={lastSaid(whatArrived, matter, t('moved.someone'))}
        yours={why}
        onLook={lookThenDecide}
        onAnyway={() => {
          /*
           * Record theirs as well. The version is dropped for this one press —
           * the member has been shown what arrived and has decided — but the
           * key stays, so a slow network still cannot land it twice.
           */
          setItMoved(false);
          setVersion(null);
        }}
        onClose={() => setItMoved(false)}
      />
    </StepWindow>
  );
}
