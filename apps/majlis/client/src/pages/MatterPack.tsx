import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, oversight, type Matter, type Pack } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { Loading, ErrorText } from '../components/ui.js';
import InTheMargin from '../components/InTheMargin.js';
import WhatTheCommitteeFound from '../components/WhatTheCommitteeFound.js';
import { State, toneForStatus } from '../components/kit.js';
import VotePanel from '../components/VotePanel.js';
import Deliberation from '../components/Deliberation.js';
import SignTheDocument from '../components/SignTheDocument.js';
import ReadTheContract from '../components/ReadTheContract.js';
import Evidence from '../components/Evidence.js';
import TellTheBank from '../components/TellTheBank.js';
import Checklist from '../components/Checklist.js';

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

/** A part of the pack: its number, its heading, and what is in it. */
function Part({
  n,
  heading,
  children,
}: {
  n: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <div className="flex gap-5">
        <span className="w-5 shrink-0 pt-1 font-mono text-[11px] text-muted">{n}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {heading}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

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
  const [failed, setFailed] = useState(false);

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
      .then((m) =>
        m && Array.isArray(m.notDecided) && Array.isArray(m.reasoning)
          ? setMatter(m)
          : setFailed(true),
      )
      .catch(() => setFailed(true));
    setPackFailed(false);
    api
      .pack(id)
      .then((p) => {
        if (p && p.question) setPack(p);
        else setPackFailed(true);
      })
      .catch(() => setPackFailed(true));
  }

  useEffect(load, [id]);

  if (failed) return <ErrorText />;
  if (!matter) return <Loading />;

  const q = pack?.question ?? null;

  return (
    <article className="flex flex-col gap-9 lg:flex-row lg:items-start">
      {/* ── the pack ──────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-2.5 text-[12.5px] text-muted">
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
            <span className="text-[12.5px] text-muted">
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
          className="mb-3 max-w-[24ch] font-display text-[32px] font-normal leading-[1.1] tracking-[-0.026em] sm:text-[38px]"
          style={{ textWrap: 'balance' }}
        >
          {matter.title}
        </h1>
        <p className="mb-8 max-w-[62ch] text-[13.5px] leading-[1.6] text-muted">
          {t('pack.intro')}
        </p>

        {/*
          The first part needs no assembling, so it is outside the guard.

          The question, and what is expressly *not* being decided, are fields
          of the matter itself. They are also the two things a member most has
          to see: a narrow approval later read as a broad endorsement is the
          failure this application was built to prevent. Hiding them behind
          the availability of five other services would be exactly wrong.
        */}
        <Part n="01" heading={t('pack.question')}>
          {/*
            The proposal, and what members marked in it. The words and the
            notes are one thing: a board portal that keeps its comments on a
            separate tab makes a reader hold two documents in their head.
          */}
          <InTheMargin on="proposal" subjectId={matter.id} />
          <p className="mt-3 text-[12.5px] text-muted">
            {q?.arrivedAt ? `${t('pack.asked')} ${day(q.arrivedAt)} · ` : ''}
            {t('pack.opened')} {day(matter.openedAt)}
          </p>

          {matter.notDecided.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-[12px] text-muted">{t('matter.notDecided')}</div>
              <ul className="space-y-1.5">
                {matter.notDecided.map((n, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.6] text-sand">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Part>

        {/*
          Outside the guard, and second, for one reason: a member votes from
          this screen, and a committee that was not of one mind is the thing
          they most need in front of them before they do.
        */}
        <Part n="02" heading={t('cttee.heading')}>
          <WhatTheCommitteeFound matterId={matter.id} />
        </Part>

        {pack && q ? (
          <>
          <Part n="03" heading={t('pack.alreadySaid')}>
            {pack.alreadySaid.nothingYet ? (
              <p className="max-w-[58ch] text-[13.5px] leading-[1.65] text-sand">
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
                      <div className="text-[13.5px] font-semibold">{r.title}</div>
                      <div className="mt-1 text-[12px] text-muted">
                        {t(`matter.status.${r.status}`)}
                        {r.relations[0] ? ` · ${r.relations[0].shared}` : ''}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Part>

          <Part n="04" heading={t('pack.figures')}>
            {pack.figures.terms.length === 0 ? (
              <p className="max-w-[58ch] text-[13.5px] leading-[1.65] text-sand">
                {t('pack.noTerms')}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {pack.figures.terms.map((term) => (
                  <li key={term.key} className="rounded-card bg-ink px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-mono text-[14px] text-lapis">
                        {term.value}
                        {term.unit ? ` ${term.unit}` : ''}
                      </span>
                      <span className="font-mono text-[11.5px] text-muted">{term.key}</span>
                    </div>
                    <div className="mt-1.5 text-[12.5px] leading-[1.55] text-sand">{term.meaning}</div>
                  </li>
                ))}
              </ul>
            )}

            {/* The sentence that must never be separated from a figure. */}
            <p className="mt-4 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">
              {t('pack.whoseMethod')}
            </p>
          </Part>

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
          <Part n="05" heading={t('pack.reading')}>
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
              <Checklist matterId={matter.id} canRule={identity?.role !== 'observer'} />
            </div>
          </Part>

          <Part n="06" heading={t('pack.said')}>
            <Deliberation
              matter={matter}
              canSpeak={identity?.role !== 'observer'}
              onChanged={setMatter}
            />
          </Part>

          <Part n="07" heading={t('pack.follows')}>
            <p className="max-w-[58ch] text-[13.5px] leading-[1.65] text-sand">
              {pack.follows.carrying.whenChecked}
            </p>
            {pack.follows.carrying.drift && (
              <p className="mt-2.5 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">
                {pack.follows.carrying.drift}
              </p>
            )}
          </Part>

          {/*
            The gaps. Same size and same weight as everything above, because a
            section that whispered would be read as a footnote.
          */}
          <Part n="08" heading={t('pack.gaps')}>
            {pack.gaps.length === 0 ? (
              <p className="text-[13.5px] text-settled">{t('pack.noGaps')}</p>
            ) : (
              <ul className="space-y-2.5">
                {pack.gaps.map((gap, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-gold/70" />
                    <span className="max-w-[58ch] text-[13.5px] leading-[1.65] text-sand">{gap}</span>
                  </li>
                ))}
              </ul>
            )}
          </Part>
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
          <p className="rounded-card bg-raised/60 px-5 py-4 text-[12.5px] leading-[1.6] text-muted shadow-ring">
            {t(packFailed ? 'pack.unavailable' : 'common.loading')}
          </p>
        )}
      </div>

      {/* ── the act, which does not move ──────────────────────────── */}
      <div className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[352px]">
        <VotePanel
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
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
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
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.scholarId}</span>
                <span className="shrink-0 text-[12px] text-muted">
                  {t(`vote.${r.position}`)}
                </span>
              </div>
            ))}
            {pack.standing.yetToSpeak.map((y) => (
              <div key={y.scholarId} className="flex items-center gap-3">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-line" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{y.name}</span>
                <span className="shrink-0 text-[12px] text-muted">{t('pack.notYet')}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-3 text-[12px] text-muted">
            {t('pack.needed')}{' '}
            <span className="font-mono tabular-nums">{pack.standing.required}</span>
          </div>
        </div>
        )}

        {/* Signing, once there is a written decision to sign. */}
        <div className="mt-5">
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
            className="text-[13px] font-semibold text-lapis underline decoration-line underline-offset-4"
          >
            {t('pack.takeItWithYou')}
          </a>
          <p className="mt-1.5 text-[12px] leading-[1.55] text-muted">{t('sign.pdf')}</p>
        </div>
      </div>
    </article>
  );
}
