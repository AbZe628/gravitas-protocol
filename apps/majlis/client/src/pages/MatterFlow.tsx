import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, oversight, type Checklist as ChecklistData, type Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { ErrorText, Loading } from '../components/ui.js';
import { State, toneForStatus } from '../components/kit.js';
import Checklist from '../components/Checklist.js';
import VotePanel from '../components/VotePanel.js';
import SignTheDocument from '../components/SignTheDocument.js';
import Deliberation from '../components/Deliberation.js';
import { useStillThere } from '../lib/stillThere.js';

/**
 * A question, answered one step at a time, ending in a vote and a document.
 *
 * ── the owner's own description of it ─────────────────────────────────────
 *
 * > A question comes in. He opens the question from the bank, and beside it
 * > everything that is required is written out, and right below it, in the
 * > application's style, are all the tools to do what needs doing. He does
 * > one, presses, it takes him to the next step, and at the end the vote. When
 * > the vote is finished it issues the PDF automatically, or writes to the
 * > policy registry, depending on whether it is a web2 or a web3 question.
 *
 * That is this screen, and it is a different shape from the one it replaces.
 * The old one is a dossier: twelve sections, every one of them shown at every
 * stage, so a matter with its vote open still displayed the conditions, the
 * discussion, the signing panel and *what we could not tell you*. Four moments
 * printed on top of each other, which is why it did not hang together.
 *
 * ── one thing at a time, and the next one follows ─────────────────────────
 *
 * The steps are the conditions of the contract shape the board is judging this
 * against. Each carries what is required in the board's own words and the tool
 * for answering it — the calculator where the condition rests on a figure, the
 * document reader where it rests on the contract. Answering one moves to the
 * next. When they are all answered the vote opens, and not before.
 *
 * ── what stays on the screen the whole way ────────────────────────────────
 *
 * The question. A member three steps in must not have to remember what they
 * are answering, and going back to look for it is how a step gets answered
 * against the wrong question.
 *
 * ── nothing was deleted ───────────────────────────────────────────────────
 *
 * The dossier is one link away and unchanged. Everything it holds that is not
 * a step — what a committee found, what this board already said before, the
 * evidence, the gaps — is material for deciding rather than a thing to do, and
 * it is there.
 */

const SETTLED = ['in_force', 'timelock', 'rejected', 'lapsed', 'withdrawn'];

export default function MatterFlow() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [matter, setMatter] = useState<Matter | null>(null);
  const [list, setList] = useState<ChecklistData | null>(null);
  const [failed, setFailed] = useState(false);
  const there = useStillThere();

  /**
   * How many steps are still unanswered.
   *
   * Seeded from the same fetch as the steps and then kept current by the
   * checklist itself, because the vote panel must unlock the moment the last
   * one is answered rather than at the next page load. Which step is open is
   * the checklist's own business and it has always handled it.
   */
  const [outstanding, setOutstanding] = useState(0);

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
      .then((c) => {
        setList(c);
        setOutstanding(c?.unanswered?.length ?? 0);
      })
      .catch(() => setList(null));
  }

  useEffect(load, [id]);

  if (failed) return <ErrorText />;
  if (!matter) return <Loading />;

  const settled = SETTLED.includes(matter.status);
  const voting = matter.status === 'voting';
  const steps = list?.conditions ?? [];


  /*
   * Where in the run this is, in words rather than a bar.
   *
   * A percentage tells a member how much is left and nothing about what. The
   * count says both, and it is the sentence the owner asked for: what is
   * required, and how far through it you are.
   */
  const answered = steps.length - outstanding;

  return (
    <article className="mx-auto w-full max-w-[760px]">
      <div className="mb-4 flex flex-wrap items-center gap-2.5 text-[12.5px] text-muted">
        <Link to="/" className="hover:text-paper">
          {t('rail.needsYou')}
        </Link>
        <span className="opacity-40">/</span>
        <span className="font-mono">{matter.id}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <State tone={matter.direction === 'restrict' ? 'breach' : 'settled'}>
          {t(`matter.direction.${matter.direction}`)}
        </State>
        <State tone={toneForStatus(matter.status)}>{t(`matter.status.${matter.status}`)}</State>
      </div>

      <h1
        className="mb-5 max-w-[26ch] font-display text-[30px] font-normal leading-[1.1] tracking-[-0.024em] sm:text-[34px]"
        style={{ textWrap: 'balance' }}
      >
        {matter.title}
      </h1>

      {/*
        The question, and it stays. A member three steps in must not have to
        remember what they are answering.
      */}
      <div className="mb-7 rounded-card bg-raised px-5 py-4 shadow-ring">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {t('flow.theQuestion')}
        </div>
        <p className="max-w-[62ch] font-display text-[15.5px] leading-[1.55] text-paper">
          {matter.proposal}
        </p>

        {matter.notDecided.length > 0 && (
          <div className="mt-3.5 border-t border-line pt-3">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {t('matter.notDecided')}
            </div>
            <ul className="space-y-1">
              {matter.notDecided.map((n, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] leading-[1.55] text-sand">
                  <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── the steps ─────────────────────────────────────────────────── */}

      {!settled && steps.length > 0 && (
        <section className="mb-7">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {t('flow.whatIsRequired')}
            </h2>
            <span className="text-[12.5px] text-muted">
              <span className="font-mono tabular-nums text-paper">{answered}</span>
              <span className="mx-1 opacity-50">/</span>
              <span className="font-mono tabular-nums">{steps.length}</span>{' '}
              {t('flow.answered')}
            </span>
          </div>

          <Checklist
            matterId={matter.id}
            canRule={identity?.role !== 'observer'}
            asked={matter.asked ?? []}
            onAsked={load}
            onProgress={(p) => setOutstanding(p.unanswered)}
          />
        </section>
      )}

      {/* ── and then the vote ─────────────────────────────────────────── */}

      {!settled && (
        <section className="mb-7">
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
        </section>
      )}

      {/*
        What members said, under the vote rather than above it.

        It belongs to the same moment as the vote and a member reads it before
        recording a position, but it is not a step: nothing is waiting on it and
        it never blocks anything.
      */}
      {!settled && (
        <section className="mb-7">
          <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('pack.said')}
          </h2>
          <Deliberation
            matter={matter}
            canSpeak={identity?.role !== 'observer'}
            onChanged={setMatter}
          />
        </section>
      )}

      {/* ── once it is decided, the document ──────────────────────────── */}

      {settled && (
        <section className="mb-7">
          <SignTheDocument matter={matter} />
        </section>
      )}

      {/*
        Everything that is material rather than a step.

        One link, at the foot, where a person who wants it will look. Putting
        the precedent, the committee's finding, the evidence and the gaps on
        the way to the vote is what made this screen a dossier.
      */}
      <div className="border-t border-line pt-5">
        <Link
          to={`/classic/matters/${matter.id}`}
          className="text-[12.5px] text-lapis underline decoration-line underline-offset-4"
        >
          {t('flow.everythingElse')}
        </Link>
        <p className="mt-1.5 max-w-[58ch] text-[12px] leading-[1.6] text-muted">
          {t('flow.everythingElseNote')}
        </p>
      </div>

      {voting && null}
    </article>
  );
}
