import type { ReactNode } from 'react';
import type { Matter, SignedDocument } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayVote, type Identity } from '../lib/identity.js';
import { Button } from './Button';

/**
 * What you do now, and the one act that does it.
 *
 * ── why this exists ───────────────────────────────────────────────────────
 *
 * The matter screen was 4,849 pixels tall and 1,103 words, with twenty-two
 * buttons and the first real act 1,072 pixels down — below the fold. Measured,
 * not felt. A member opening it had to read a thousand words to work out what
 * was wanted of them, and the owner's verdict on that was the right one: the
 * application does not lead anybody anywhere.
 *
 * So one card sits at the top of the record and answers the only question a
 * person actually arrives with: **what do I do here**. One sentence, one
 * button. Everything else on the page folds shut behind it.
 *
 * ── it is computed, never typed ───────────────────────────────────────────
 *
 * The state, the role, whether this member has voted, whether the conditions
 * are answered, whether they have signed. Every one of those is already in the
 * record, and a person should not have to assemble them in their head. The
 * order below is the order a matter actually moves in, and the first case that
 * matches is the answer.
 *
 * ── and it never invents an act ───────────────────────────────────────────
 *
 * Where there is nothing for this person to do, it says so plainly and shows
 * no button. A card that always ends in something to press would teach people
 * to press it. *Waiting on the others* is a real state, and it is the honest
 * one for most members for most of a matter's life.
 */

export interface Doing {
  /** What is going on, in one sentence. */
  says: string;
  /** What to press, where there is something. */
  act?: { label: string; onPress: () => void };
  /** Quiet where nothing is wanted of this person. */
  tone: 'act' | 'waiting';
}

/**
 * Work out what this person does next on this matter.
 *
 * Exported apart from the component so it can be tested without a browser, and
 * so the same answer can be shown in a list later without a second opinion
 * about what the next step is.
 */
export function whatToDoNow(input: {
  matter: Matter;
  identity: Identity | null;
  /** Conditions of the shape with no answer yet. */
  stepsOutstanding: number;
  /** How many have spoken. A vote does not open before anybody has. */
  saidCount: number;
  /** The document, once there is one. Null while it is still coming. */
  doc: SignedDocument | null;
  t: (key: string) => string;
  go: (where: 'steps' | 'discussion' | 'vote' | 'sign' | 'object') => void;
}): Doing {
  const { matter, identity, stepsOutstanding, saidCount, doc, t, go } = input;
  const canVote = mayVote(identity?.role);
  const mine = identity?.scholarId;

  const voted = (matter.reasoning ?? []).some((r) => r.scholarId === mine && !r.releasedAt);
  const signed = (doc?.signings ?? []).some(
    (s) => s.scholarId === mine && s.documentHash === doc?.documentHash,
  );

  // ── the matter is finished ──────────────────────────────────────────────

  if (matter.status === 'withdrawn' || matter.status === 'rejected' || matter.status === 'lapsed') {
    return { says: t(`now.${matter.status}`), tone: 'waiting' };
  }

  // ── it is in force: what is left is signing the written decision ────────

  if (matter.status === 'in_force') {
    if (canVote && doc && !signed) {
      return {
        says: t('now.toSign'),
        act: { label: t('now.goSign'), onPress: () => go('sign') },
        tone: 'act',
      };
    }
    return { says: t(signed ? 'now.haveSigned' : 'now.inForce'), tone: 'waiting' };
  }

  // ── the waiting period ──────────────────────────────────────────────────

  if (matter.status === 'timelock') {
    if (canVote) {
      return {
        says: t('now.timelock'),
        act: { label: t('now.goObject'), onPress: () => go('object') },
        tone: 'waiting',
      };
    }
    return { says: t('now.timelockWatch'), tone: 'waiting' };
  }

  // ── the vote is open ────────────────────────────────────────────────────

  if (matter.status === 'voting') {
    if (!canVote) return { says: t('now.votingWatch'), tone: 'waiting' };
    if (!voted) {
      return {
        says: t('now.toVote'),
        act: { label: t('now.goVote'), onPress: () => go('vote') },
        tone: 'act',
      };
    }
    return { says: t('now.haveVoted'), tone: 'waiting' };
  }

  // ── before the vote ─────────────────────────────────────────────────────

  if (!canVote) return { says: t('now.readAndSay'), tone: 'waiting' };

  if (matter.status === 'draft') {
    return {
      says: t('now.draft'),
      act: { label: t('now.goDiscussion'), onPress: () => go('discussion') },
      tone: 'act',
    };
  }

  if (stepsOutstanding > 0) {
    return {
      says: `${stepsOutstanding} ${t('now.steps')}`,
      act: { label: t('now.goSteps'), onPress: () => go('steps') },
      tone: 'act',
    };
  }

  if (saidCount === 0) {
    return {
      says: t('now.nobodySaid'),
      act: { label: t('now.goDiscussion'), onPress: () => go('discussion') },
      tone: 'act',
    };
  }

  return {
    says: t('now.readyToVote'),
    act: { label: t('now.goOpenVote'), onPress: () => go('vote') },
    tone: 'act',
  };
}

export default function NextAct({ doing, children }: { doing: Doing; children?: ReactNode }) {
  const { t } = useI18n();

  return (
    <div
      className={
        'mb-8 rounded-sheet px-6 py-5 shadow-card sm:px-7 sm:py-6 ' +
        (doing.tone === 'act' ? 'bg-lapis text-white' : 'bg-raised')
      }
    >
      <div
        className={
          'mb-2 text-label font-bold uppercase tracking-caps ' +
          (doing.tone === 'act' ? 'text-white/70' : 'text-muted')
        }
      >
        {t('now.title')}
      </div>

      <p
        className={
          'max-w-[52ch] text-lead leading-snug ' +
          (doing.tone === 'act' ? 'text-white' : 'text-paper')
        }
      >
        {doing.says}
      </p>

      {doing.act && (
        <Button
          type="button"
          onClick={doing.act.onPress}
          className={
            'mt-4 rounded-card px-6 py-3 text-body font-bold shadow-act ' +
            (doing.tone === 'act' ? 'bg-white text-lapis' : 'bg-lapis text-white')
          }
        >
          {doing.act.label}
        </Button>
      )}

      {children}
    </div>
  );
}
