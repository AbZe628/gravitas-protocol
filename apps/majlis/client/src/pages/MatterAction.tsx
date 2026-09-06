import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, oversight, type Matter, type Passage } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { Loading, ErrorText, Tag } from '../components/ui.js';
import VotePanel from '../components/VotePanel.js';
import Deliberation from '../components/Deliberation.js';
import Inherited from '../components/Inherited.js';
import Checklist from '../components/Checklist.js';

/**
 * One matter, one act.
 *
 * `MatterDetail` puts twelve sections on a page and a scholar scrolls past all
 * of them to find the one thing they came to do. Every one of those sections
 * earns its place — none is removed here, and the whole page is one link away —
 * but a person arriving to cast a position should not have to read the register
 * of everything the board knows in order to reach it.
 *
 * So this is the same matter in three parts: **what it is**, **the one act that
 * is outstanding**, and **what happened**. Nothing else is on the screen at
 * once.
 *
 * ── the act is whatever the passage says it is ────────────────────────────
 *
 * Not always the vote. A matter in deliberation needs somebody to speak, one
 * being drafted needs its conditions answered, one in the delay needs nothing
 * at all. `passage.ts` already works out which, and this screen shows that one
 * and no other — which is the difference between a wizard and a form with the
 * irrelevant parts greyed out.
 *
 * ── depth is one tap, never gone ──────────────────────────────────────────
 *
 * The mechanism, the terms and their hash, the simulation, the evidence, the
 * screening, the precedent, what it rests on, what is held outside the
 * question: all still there, all on the full page, one link from here. The
 * rule this screen holds is that they do not compete with the act — not that a
 * scholar should be kept from them.
 *
 * ── and the frictions stay ────────────────────────────────────────────────
 *
 * Voting still requires reasoning in the member's own words. Terms still freeze
 * when the vote opens and every position still carries their hash. The vote
 * still does not close itself. Those are not complications that survived a
 * simplification — they are the reason the record is worth more than a PDF, and
 * making them fast is a different thing from making them optional.
 */

type Step = 'what' | 'act' | 'done';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{label}</div>
      <div className="text-[14px] leading-[1.62] text-sand">{children}</div>
    </div>
  );
}

export default function MatterAction() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [matter, setMatter] = useState<Matter | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<Step>('what');

  const load = () => {
    api.matter(id).then(setMatter).catch(() => setFailed(true));
    oversight
      .passage(id)
      .then((p) => Array.isArray(p?.deciding) && setPassage(p))
      .catch(() => undefined);
  };

  useEffect(load, [id]);

  if (failed) return <ErrorText />;
  if (!matter) return <Loading />;

  const next = passage?.next ?? null;
  // The vote is the act this screen can actually carry out. Everything else it
  // names and points at, rather than pretending to offer.
  const votable = next?.key === 'positions' || next?.key === 'open_vote' || next?.key === 'close';

  return (
    <div>
      <Link
        to="/"
        className="mb-4 inline-block text-[12.5px] text-muted underline decoration-line underline-offset-4 hover:text-paper"
      >
        {t('action.back')}
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Tag>{t(`matter.direction.${matter.direction}`)}</Tag>
        <Tag>{t(`matter.status.${matter.status}`)}</Tag>
      </div>

      <h1
        className="mb-5 max-w-[24ch] font-display text-[28px] font-normal leading-[1.14] tracking-[-0.022em] sm:text-[32px]"
        style={{ textWrap: 'balance' }}
      >
        {matter.title}
      </h1>

      {/* ── what it is ─────────────────────────────────────────────────── */}

      {step === 'what' && (
        <>
          <Detail label={t('matter.proposal')}>{matter.proposal}</Detail>

          {matter.notDecided.length > 0 && (
            <Detail label={t('matter.notDecided')}>
              <ul className="space-y-1.5">
                {matter.notDecided.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                    <span className="text-[12.5px] text-muted">{line}</span>
                  </li>
                ))}
              </ul>
            </Detail>
          )}

          {/*
            What this board already said about a question of this shape. Here
            rather than deeper in, because it is the thing that turns reading
            the question into most of the work already done.
          */}
          <Inherited matterId={matter.id} canRule={identity?.role !== 'observer'} onChanged={load} />

          {/*
            One sentence about where this stands, in place of the whole
            passage. On a screen whose point is the next act, the map of every
            act is the thing competing with it.
          */}
          {next && (
            <div className="mb-5 rounded-card bg-raised px-5 py-4 shadow-card">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                {t('passage.next')}
              </div>
              <div className="mt-0.5 text-[14px] leading-snug">
                {next.act}
                <span className="ms-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                  {t(`passage.whose.${next.whose}`)}
                </span>
              </div>
              {next.standing && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{next.standing}</p>
              )}
            </div>
          )}

          {passage?.settled && (
            <p className="mb-5 rounded-card shadow-ring px-4 py-3 text-[13px] leading-relaxed">
              {passage.settled}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {votable && (
              <button
                type="button"
                onClick={() => setStep('act')}
                className="rounded-xl shadow-[0_0_0_0.5px_rgba(176,132,48,0.24)] px-3.5 py-1.5 text-[13px] text-white font-semibold shadow-act transition-colors hover:bg-lapis"
              >
                {t('action.toAct')}
              </button>
            )}
            {/*
              Everything else about this matter — the mechanism, the terms and
              their hash, the simulation, the evidence, the screening, the
              precedent. Nothing was removed; it is one tap away.
            */}
            <Link
              to={`/classic/matters/${matter.id}`}
              className="rounded-xl shadow-ring px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:text-paper"
            >
              {t('action.everything')}
            </Link>
          </div>
        </>
      )}

      {/* ── the one act ────────────────────────────────────────────────── */}

      {step === 'act' && (
        <>
          <VotePanel
            matter={matter}
            role={identity?.role}
            scholarId={identity?.scholarId}
            onChanged={(m) => {
              setMatter(m);
              setStep('done');
              load();
            }}
          />

          {/*
            The discussion, under the act rather than beside it. A member about
            to take a position wants to read what colleagues said, and reaching
            it should not mean leaving the screen.
          */}
          <div className="mt-6">
            <Deliberation matter={matter} canSpeak={identity?.role !== 'observer'} onChanged={setMatter} />
          </div>

          <button
            type="button"
            onClick={() => setStep('what')}
            className="mt-5 text-[12.5px] text-muted underline decoration-line underline-offset-4 hover:text-paper"
          >
            {t('action.backToWhat')}
          </button>
        </>
      )}

      {/* ── what happened ──────────────────────────────────────────────── */}

      {step === 'done' && (
        <>
          <p className="mb-4 rounded-card shadow-[0_0_0_0.5px_rgba(176,132,48,0.24)] bg-[#FBF4E4]] px-4 py-3.5 text-[13.5px] leading-relaxed">
            {t('action.recorded')}
          </p>

          {/*
            Where it stands now, in the server's words. A confirmation that
            said "done" and nothing else would leave a member wondering whether
            the matter is decided — it usually is not.
          */}
          {passage?.next && (
            <div className="mb-5 rounded-card bg-raised/70 px-5 py-4 shadow-ring">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                {t('passage.next')}
              </div>
              <div className="mt-0.5 text-[14px] leading-snug">{passage.next.act}</div>
              {passage.next.standing && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                  {passage.next.standing}
                </p>
              )}
            </div>
          )}

          <Link
            to="/"
            className="inline-block rounded-xl shadow-ring px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:text-paper"
          >
            {t('action.home')}
          </Link>
        </>
      )}

      {/*
        The conditions, on the first step and nowhere else. They are the board's
        findings and a scholar answers them — inheritance now proposes most of
        them — so they belong with the question rather than with the vote.
      */}
      {step === 'what' && (
        <div className="mt-8 border-t border-line pt-5">
          <Checklist matterId={matter.id} canRule={identity?.role !== 'observer'} />
        </div>
      )}
    </div>
  );
}
