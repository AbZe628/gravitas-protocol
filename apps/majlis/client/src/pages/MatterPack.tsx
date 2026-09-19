import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, oversight, type Matter, type Pack, type SignedDocument } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { Loading, ErrorText } from '../components/ui.js';
import InTheMargin from '../components/InTheMargin.js';
import WhatTheCommitteeFound from '../components/WhatTheCommitteeFound.js';
import WhatMustHappen from '../components/WhatMustHappen.js';
import { State, toneForStatus } from '../components/kit.js';
import VotePanel from '../components/VotePanel.js';
import Deliberation from '../components/Deliberation.js';
import SignTheDocument from '../components/SignTheDocument.js';
import ReadTheContract from '../components/ReadTheContract.js';
import Evidence from '../components/Evidence.js';
import TellTheBank from '../components/TellTheBank.js';
import Checklist from '../components/Checklist.js';
import Fold from '../components/Fold.js';
import NextAct, { whatToDoNow } from '../components/NextAct.js';
import { useStillThere } from '../lib/stillThere.js';

/**
 * One matter, everything for it, one act.
 *
 * This replaces a three-step wizard. A member arriving at a matter had to
 * press through *what it is*, then *the act*, then *what happened* — and the
 * material they needed in order to decide was on four other screens
 * altogether: the precedent on one, the figures on another, the deliberation
 * on a third, what the terms would do on a fourth.
 *
 * Every board portal that corporate directors use solves this the same way,
 * and has for twenty years: before a vote you are handed a pack, and
 * everything is inside it, in the order you read it. That is all this screen
 * is.
 *
 * ── the parts are numbered because they are a sequence ────────────────────
 *
 * Not decoration. A member reads what was asked, then what this board has
 * already said about it, then the figures, then what colleagues said, then
 * what happens if it passes, and then what nobody can tell them. Each part
 * only makes sense after the one above it.
 *
 * ── the act does not move ─────────────────────────────────────────────────
 *
 * On a wide screen the position sits in a column of its own and stays in
 * view. A member who has read six parts should not have to scroll back up
 * past all of them to act, which is what the old page made them do.
 *
 * ── the sixth part is the one that matters ────────────────────────────────
 *
 * *What we could not tell you* is not an appendix and it is not muted. A pack
 * that showed five confident sections and no seams would be read as complete,
 * and a member would vote on it as though it were.
 */

/** The statuses a decision exists for. Mirrors SETTLED in services/fatwa.ts. */
const DECIDED_STATUSES = ['in_force', 'timelock', 'rejected', 'lapsed', 'withdrawn'];

function day(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

export default function MatterPack() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [pack, setPack] = useState<Pack | null>(null);
  // Null while it is still coming; true only once it actually failed.
  const [packFailed, setPackFailed] = useState(false);
  const [matter, setMatter] = useState<Matter | null>(null);
  /*
   * How much of the shape is still unanswered.
   *
   * Reported up by the checklist rather than fetched here. The act column
   * needs it to know whether to offer the vote at all, and two readers of one
   * checklist would disagree the moment a finding was recorded.
   */
  const [stepsOutstanding, setStepsOutstanding] = useState(0);
  /**
   * The written decision, for the card at the top.
   *
   * Fetched here rather than asked of the signing panel, because the card has
   * to know whether this member has signed before the panel is ever opened —
   * it is folded shut, and the whole point is that they are told to open it.
   */
  const [doc, setDoc] = useState<SignedDocument | null>(null);
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  function load() {
    if (!id) return;
    /*
     * The matter is required; the pack is not.
     *
     * A member must be able to open a matter and act on it even when the pack
     * cannot be assembled — against an older server, or when one of the five
     * services it draws on is down. The parts then say they are unavailable
     * and the act still works, rather than the whole screen going white.
     */
    api
      .matter(id)
      .then((m) => {
        if (m && Array.isArray(m.notDecided) && Array.isArray(m.reasoning)) {
          there.arrived();
          setMatter(m);
        } else {
          there.lost(setFailed);
        }
      })
      .catch(() => there.lost(setFailed));
    setPackFailed(false);
    api
      .pack(id)
      .then((p) => {
        if (p && p.question) setPack(p);
        else setPackFailed(true);
      })
      .catch(() => setPackFailed(true));

    /* Only a settled matter has one, and not knowing is a state: the card
       then says what is true before the document exists. */
    oversight
      .document(id)
      .then(setDoc)
      .catch(() => setDoc(null));

    /*
     * How many conditions are unanswered, read here rather than reported up
     * by the checklist.
     *
     * It used to come from the checklist as it drew itself. Folding that part
     * shut broke it in the worst possible way: nothing rendered, nothing
     * reported, the count stayed at zero, and the card cheerfully said the
     * vote could open on a matter the server would refuse. A screen must not
     * depend on a child having been drawn to know what is true.
     */
    oversight
      .checklist(id)
      .then((c) => setStepsOutstanding(c?.unanswered?.length ?? 0))
      .catch(() => setStepsOutstanding(0));
  }

  useEffect(load, [id]);

  if (failed) return <ErrorText />;
  if (!matter) return <Loading />;

  const q = pack?.question ?? null;

  /**
   * What this member does next, and where pressing it takes them.
   *
   * Scrolling rather than routing: everything is on this one screen, and a
   * member who is sent somewhere else loses the question they were reading.
   * The part being sent to opens itself, because arriving at a shut row would
   * be the same as not arriving.
   */
  const doing = whatToDoNow({
    matter,
    identity,
    stepsOutstanding,
    saidCount: matter.deliberation?.length ?? 0,
    doc,
    t,
    go: (where) => {
      const target = document.getElementById(`at-${where}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  });

  /** Which part the act points at, so that one is drawn open. */
  const pointingAt = doing.act
    ? (doing.says === t('now.readyToVote') || matter.status === 'voting'
        ? 'vote'
        : matter.status === 'in_force'
          ? 'sign'
          : stepsOutstanding > 0
            ? 'steps'
            : 'discussion')
    : null;

  return (
    <article className="flex flex-col gap-9 lg:flex-row lg:items-start">
      {/* ── the pack ──────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-2.5 text-ui text-muted">
          <Link to="/classic" className="hover:text-paper">
            {t('door.deciding')}
          </Link>
          <span className="opacity-40">/</span>
          <span className="font-mono">{matter.id}</span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <State tone={matter.direction === 'restrict' ? 'breach' : 'settled'}>
            {t(`matter.direction.${matter.direction}`)}
          </State>
          <State tone={toneForStatus(matter.status)}>{t(`matter.status.${matter.status}`)}</State>
          {q && q.waitedDays !== null && (
            <span className="text-ui text-muted">
              {t('pack.waiting')}{' '}
              <span className="font-mono tabular-nums text-gold">{q.waitedDays}</span>{' '}
              {t('guided.days')}
              {q.waitPartlyUnknown && (
                <span className="ms-1.5 opacity-70">{t('pack.waitUnderstated')}</span>
              )}
            </span>
          )}
        </div>

        <h1
          className="mb-3 max-w-[24ch] font-display text-head font-normal leading-tight tracking-display sm:text-display"
          style={{ textWrap: 'balance' }}
        >
          {matter.title}
        </h1>
        {/*
          What you do now, before anything else on the page.

          The paragraph that used to sit here explained what a pack was. A
          member does not arrive wanting to know what a pack is; they arrive
          wanting to know what is wanted of them.
        */}
        <NextAct doing={doing} />

        {/*
          The first part needs no assembling, so it is outside the guard.

          The question, and what is expressly *not* being decided, are fields
          of the matter itself. They are also the two things a member most has
          to see: a narrow approval later read as a broad endorsement is the
          failure this application was built to prevent. Hiding them behind
          the availability of five other services would be exactly wrong.
        */}
        <Fold heading={t('pack.question')} alwaysOpen>
          {/*
            The proposal, and what members marked in it. The words and the
            notes are one thing: a board portal that keeps its comments on a
            separate tab makes a reader hold two documents in their head.
          */}
          <InTheMargin on="proposal" subjectId={matter.id} />
          <p className="mt-3 text-ui text-muted">
            {q?.arrivedAt ? `${t('pack.asked')} ${day(q.arrivedAt)} · ` : ''}
            {t('pack.opened')} {day(matter.openedAt)}
          </p>

          {matter.notDecided.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-note text-muted">{t('matter.notDecided')}</div>
              <ul className="space-y-1.5">
                {matter.notDecided.map((n, i) => (
                  <li key={i} className="flex gap-2.5 text-body leading-relaxed text-sand">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Fold>

        {/*
          Outside the guard, and second, for one reason: a member votes from
          this screen, and a committee that was not of one mind is the thing
          they most need in front of them before they do.
        */}
        <Fold heading={t('cttee.heading')}>
          <WhatTheCommitteeFound matterId={matter.id} />
        </Fold>

        {pack && q ? (
          <>
          <Fold heading={t('pack.alreadySaid')} summary={pack.alreadySaid.nothingYet ? t('fold.noPrecedent') : `${pack.alreadySaid.related.length} ${t('fold.precedent')}`}>
            {pack.alreadySaid.nothingYet ? (
              <p className="max-w-[58ch] text-body leading-relaxed text-sand">
                {t('pack.noPrecedent')}
              </p>
            ) : (
              <ul className="space-y-2">
                {pack.alreadySaid.related.map((r) => (
                  <li key={r.matterId}>
                    <Link
                      to={`/matters/${r.matterId}`}
                      className="block rounded-card bg-ink px-4 py-3 shadow-ring transition-shadow hover:shadow-card"
                    >
                      <div className="text-body font-semibold">{r.title}</div>
                      <div className="mt-1 text-note text-muted">
                        {t(`matter.status.${r.status}`)}
                        {r.relations[0] ? ` · ${r.relations[0].shared}` : ''}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Fold>

          <Fold heading={t('pack.figures')} summary={`${pack.figures.terms.length} ${t('fold.terms')}`}>
            {pack.figures.terms.length === 0 ? (
              <p className="max-w-[58ch] text-body leading-relaxed text-sand">
                {t('pack.noTerms')}
              </p>
            ) : (
              /*
                The figure and the board's sentence together, the identifier
                under them.

                This put the value and the key on the first line and the
                board's own words underneath in a smaller, quieter face, so a
                member reading the terms of a ruling met
                `maxProviderBorrowingBps` and `suspend_new_positions` before
                meeting anything the board had written. The third place in the
                application with the same fault, after the examination finding
                and the terms panel.

                The key stays, small and in mono, for the engineer wiring the
                ruling into the registry and the auditor tracing a finding.
              */
              <ul className="space-y-2.5">
                {pack.figures.terms.map((term) => (
                  <li key={term.key} className="rounded-card bg-ink px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="max-w-[52ch] text-body leading-snug text-paper">
                        {term.meaning}
                      </span>
                      <span className="shrink-0 font-mono text-body text-lapis">
                        {term.value}
                        {term.unit ? ` ${term.unit}` : ''}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-label text-muted opacity-70">
                      {term.key}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* The sentence that must never be separated from a figure. */}
            <p className="mt-4 max-w-[58ch] text-ui leading-relaxed text-muted">
              {t('pack.whoseMethod')}
            </p>
          </Fold>

          {/*
            The reading, and then the conditions a member actually rules on.

            This is the step the whole flow was missing: a contract comes in,
            somebody reads it against the conditions, the board looks at what
            was found, changes what needs changing, and votes. Everything but
            the reading existed — and the reading existed on the server and was
            reachable from no screen at all.

            It sits above the deliberation on purpose. You read the text, then
            you say what you think about it.
          */}
          <div id="at-steps" />
          <Fold heading={t('pack.reading')} summary={stepsOutstanding > 0 ? `${stepsOutstanding} ${t('fold.stepsLeft')}` : t('fold.stepsDone')} open={pointingAt === 'steps'}>
            {/*
              The documents themselves, and then reading one against the
              conditions. Attaching was reachable only from the classic
              address, which nothing in the navigation opens — so a member
              walking the ordinary path had no way to put a document in
              front of the board.
            */}
            <Evidence
              matter={matter}
              scholarId={identity?.scholarId}
              canAttach={mayDeliberate(identity?.role)}
              onChanged={setMatter}
            />

            <div className="mt-6">
            <ReadTheContract matterId={matter.id} canRead={identity?.role !== 'observer'} />
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <Checklist
                matterId={matter.id}
                canRule={identity?.role !== 'observer'}
                /* Passed from the matter this page already holds, rather than
                   fetched again: a second copy of one record can disagree with
                   the first, and the step would then show a stale question. */
                asked={matter.asked ?? []}
                onAsked={load}
                onProgress={(p) => setStepsOutstanding(p.unanswered)}
              />
            </div>
          </Fold>

          <div id="at-discussion" />
          <Fold heading={t('pack.said')} summary={`${matter.deliberation?.length ?? 0} ${t('fold.said')}`} open={pointingAt === 'discussion'}>
            <Deliberation
              matter={matter}
              canSpeak={identity?.role !== 'observer'}
              onChanged={setMatter}
            />
          </Fold>

          <Fold heading={t('pack.follows')} summary={t('fold.follows')}>
            <p className="max-w-[58ch] text-body leading-relaxed text-sand">
              {pack.follows.carrying.whenChecked}
            </p>
            {pack.follows.carrying.drift && (
              <p className="mt-2.5 max-w-[58ch] text-ui leading-relaxed text-muted">
                {pack.follows.carrying.drift}
              </p>
            )}

            {/*
              Holding by holding, where a chain is attached.

              The two paragraphs above answer for the installation, and for a
              bank that holds both kinds that is only half true: a ruling over
              a conventional holding is carried out by people exactly as it
              would be with no chain anywhere. Saying otherwise is a
              comfortable sentence and a false one.

              Absent where nothing is attached, and where the ruling names no
              holding. Neither is a gap — there is simply nothing to
              distinguish.
            */}
            {pack.follows.carriedOut?.attached && !pack.follows.carriedOut.namesNoHolding && (
              <div className="mt-4 rounded-card bg-ink px-5 py-4">
                <p className="max-w-[58ch] text-ui leading-relaxed text-paper">
                  {pack.follows.carriedInAWord}
                </p>

                <div className="mt-3 space-y-2.5">
                  {[
                    { held: pack.follows.carriedOut.byContract, how: 'carry.byContract' },
                    { held: pack.follows.carriedOut.byPeople, how: 'carry.byPeople' },
                  ]
                    .filter((group) => group.held.length > 0)
                    .map((group) => (
                      <div key={group.how}>
                        <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
                          {t(group.how)}
                        </div>
                        <ul className="space-y-1">
                          {group.held.map((h) => (
                            <li key={h.assetId} className="text-ui leading-snug text-sand">
                              {h.name}
                              {/*
                                Where the answer came from. A board that was
                                never asked can see that it was never asked.
                              */}
                              <span className="ms-2 text-note text-muted">
                                {t(`carry.basis.${h.basis}`)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/*
              And what the institution does about it.

              This belongs in the part about what follows, because it is the
              other half of it: the paragraphs above say when the terms get
              tested, and these say what the people in the bank do. They are
              printed on the written ruling and in the compliance manual, and
              nothing ever set them — so every ruling issued from here had an
              empty implementation section.
            */}
            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-2.5 text-label font-bold uppercase tracking-caps text-muted">
                {t('doing.title')}
              </div>
              <WhatMustHappen
                matter={matter}
                canEdit={mayDeliberate(identity?.role)}
                onChanged={setMatter}
              />
            </div>
          </Fold>

          {/*
            The gaps. Same size and same weight as everything above, because a
            section that whispered would be read as a footnote.
          */}
          <Fold heading={t('pack.gaps')} summary={pack.gaps.length === 0 ? t('fold.noGaps') : `${pack.gaps.length} ${t('fold.gaps')}`}>
            {pack.gaps.length === 0 ? (
              <p className="text-body text-settled">{t('pack.noGaps')}</p>
            ) : (
              <ul className="space-y-2.5">
                {pack.gaps.map((gap, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-gold/70" />
                    <span className="max-w-[58ch] text-body leading-relaxed text-sand">{gap}</span>
                  </li>
                ))}
              </ul>
            )}
          </Fold>
          </>
        ) : (
          /*
           * Said plainly and in place: a blank column here would read as a
           * matter with nothing in it. Which sentence depends on whether
           * the pack has failed or has simply not arrived — the matter
           * loads first, so there is always a moment where neither is
           * true yet, and claiming a failure in it was a lie the screen
           * told every member on the way in.
           */
          <p className="rounded-card bg-raised/60 px-5 py-4 text-ui leading-relaxed text-muted shadow-ring">
            {t(packFailed ? 'pack.unavailable' : 'common.loading')}
          </p>
        )}
      </div>

      {/* ── the act, which does not move ──────────────────────────── */}
      <div className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[352px]">
        <div id="at-vote" />
        <div id="at-object" />
        <VotePanel
          stepsOutstanding={stepsOutstanding}
          matter={matter}
          role={identity?.role}
          scholarId={identity?.scholarId}
          onChanged={(m) => {
            setMatter(m);
            load();
          }}
        />

        {/* Who has voted, and who has not. Naming both is the point. */}
        {pack?.standing && (
        <div className="mt-5 rounded-sheet bg-raised/70 p-5 shadow-ring">
          <div className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
            {t('pack.whereItStands')}
          </div>
          <div className="space-y-2.5">
            {pack.standing.recorded.map((r) => (
              <div key={r.scholarId} className="flex items-center gap-3">
                <span
                  className={
                    'h-[7px] w-[7px] shrink-0 rounded-full ' +
                    (r.position === 'for'
                      ? 'bg-settled'
                      : r.position === 'against'
                        ? 'bg-breach'
                        : 'bg-muted')
                  }
                />
                <span className="min-w-0 flex-1 truncate text-ui">{r.scholarId}</span>
                <span className="shrink-0 text-note text-muted">
                  {t(`vote.${r.position}`)}
                </span>
              </div>
            ))}
            {pack.standing.yetToSpeak.map((y) => (
              <div key={y.scholarId} className="flex items-center gap-3">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-line" />
                <span className="min-w-0 flex-1 truncate text-ui text-muted">{y.name}</span>
                <span className="shrink-0 text-note text-muted">{t('pack.notYet')}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-3 text-note text-muted">
            {t('pack.needed')}{' '}
            <span className="font-mono tabular-nums">{pack.standing.required}</span>
          </div>
        </div>
        )}

        {/* Signing, once there is a written decision to sign. */}
        <div className="mt-5">
          <div id="at-sign" />
          <SignTheDocument matter={matter} />
        </div>

        {/*
          And then you tell the bank. The half of every task that existed
          nowhere: the board decided, and the desk that asked found out by
          somebody remembering to write an email.
        */}
        {DECIDED_STATUSES.includes(matter.status) && (
          <TellTheBank kind={matter.status === 'rejected' ? 'refusal' : 'ruling'} id={matter.id} />
        )}

        <div className="mt-5 px-1">
          <a
            href={oversight.hrefs.fatwa(matter.id)}
            target="_blank"
            rel="noreferrer"
            className="text-ui font-semibold text-lapis underline decoration-line underline-offset-4"
          >
            {t('pack.takeItWithYou')}
          </a>
          <p className="mt-1.5 text-note leading-relaxed text-muted">{t('sign.pdf')}</p>
        </div>
      </div>
    </article>
  );
}
