import type { ReactNode } from 'react';
import type { Matter, Passage, Say, SignedDocument, Whose } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, mayVote, type Identity } from '../lib/identity.js';
import { nameOf, useMembers } from '../lib/members.js';
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
 * ── it does not decide; it asks ───────────────────────────────────────────
 *
 * This file used to work out the next act itself, from the status, the role,
 * the vote, the conditions — a hundred lines of cases, and the second place in
 * this application that claimed to know what follows what. It disagreed with
 * the first almost immediately. `services/passage.ts` refuses on principle to
 * say a matter is ready to be voted on, because that is a judgement and the
 * board's; this card said **The vote can open** in the largest words on the
 * screen. Two authorities, and the louder one was the one that had never read
 * the rules.
 *
 * Now the spine says which step is next, whose it is and what is in the way,
 * in the words of the reader's own language, and this card renders that
 * sentence. What it adds is the two things the spine cannot know, because the
 * spine describes a matter and this describes a person looking at one:
 *
 *   - **whether the act is theirs**, which decides whether a button is offered
 *     at all rather than an owner named;
 *   - **whether they have already done their part** — voted, signed — which
 *     the passage has no view of, since it is the matter's and not the
 *     member's.
 *
 * Everything else comes down the wire already decided.
 *
 * ── and it never invents an act ───────────────────────────────────────────
 *
 * Where there is nothing for this person to do, it says so plainly, names whom
 * it is with, and shows no button. A card that always ends in something to
 * press would teach people to press it. *Waiting on the others* is a real
 * state, and it is the honest one for most members for most of a matter's
 * life.
 */

/** The parts of the record a step is actually carried out in. */
export type Pane = 'steps' | 'discussion' | 'vote' | 'sign' | 'object';

/**
 * Where each step of the spine is done on this screen, and what the button
 * says.
 *
 * A step missing from this table gets no button, deliberately rather than by
 * omission. The question arriving is the institution's, the mechanism is the
 * liaison's, the document is written by the software — none of them is an act
 * a member of the board performs, and offering a control that cannot be
 * honoured is worse than offering none.
 */
const WHERE: Record<string, { pane: Pane; label: string }> = {
  conditions: { pane: 'steps', label: 'now.goSteps' },
  rests_on: { pane: 'steps', label: 'now.goSteps' },
  deliberation: { pane: 'discussion', label: 'now.goDiscussion' },
  open_vote: { pane: 'vote', label: 'now.goOpenVote' },
  positions: { pane: 'vote', label: 'now.goVote' },
  close: { pane: 'vote', label: 'now.goVote' },
  timelock: { pane: 'object', label: 'now.goObject' },
};

export interface Doing {
  /** What is going on, in one sentence. */
  says: string;
  /** What is in the way, where the spine named something. */
  standing?: string;
  /**
   * Whose act it is, where it is not this member's.
   *
   * Named rather than left to be inferred: the commonest way a matter stalls
   * is that each side believes it is with the other.
   */
  whose?: Whose;
  /**
   * The person it is with, where the step was placed with somebody else — a
   * scholar id, named on the card by the board's list.
   */
  who?: string;
  /**
   * What to press, where there is something.
   *
   * `pane` is carried beside the handler because the screen has to know where
   * the act points *before* anybody presses it — the part being sent to is
   * drawn open, since arriving at a shut row is the same as not arriving. It
   * used to be worked out a second time by comparing the card's sentence
   * against a translated string, which opened the wrong part in Arabic.
   */
  act?: { label: string; pane: Pane; onPress: () => void };
  /** Quiet where nothing is wanted of this person. */
  tone: 'act' | 'waiting';
}

/**
 * Whether a step of this owner is one this member could carry out.
 *
 * The role only; the route is what actually refuses. A step belonging to the
 * institution, the liaison, the software or the clock is nobody on the board's
 * to press, so it is named and not offered.
 */
function theirs(whose: Whose, identity: Identity | null): boolean {
  if (whose === 'signatory') return mayVote(identity?.role);
  if (whose === 'board') return mayDeliberate(identity?.role);
  return false;
}

/**
 * What this member does next on this matter.
 *
 * Null while the spine has not answered. A card guessed from the status would
 * be the second opinion this was written to remove, and the record below is
 * readable without it.
 *
 * Exported apart from the component so it can be tested without a browser.
 */
export function whatToDoNow(input: {
  passage: Passage | null;
  matter: Matter;
  identity: Identity | null;
  /** The document, once there is one. Null while it is still coming. */
  doc: SignedDocument | null;
  t: (key: string) => string;
  say: (s: Say | null | undefined) => string;
  go: (where: Pane) => void;
}): Doing | null {
  const { passage, matter, identity, doc, t, say, go } = input;
  if (!passage) return null;

  const mine = identity?.scholarId;
  const voted = (matter.reasoning ?? []).some((r) => r.scholarId === mine && !r.releasedAt);
  const signed = (doc?.signings ?? []).some(
    (s) => s.scholarId === mine && s.documentHash === doc?.documentHash,
  );

  /*
   * Signing, which is the one act the spine cannot see.
   *
   * The passage's last step is the document being *issued*, which the software
   * does. Who has put their name to it afterwards is a fact about a person,
   * and a matter in force still has something outstanding for a signatory who
   * has not signed. Before the settled sentence, because to them it is not
   * finished.
   */
  if (matter.status === 'in_force' && mayVote(identity?.role) && doc && !signed) {
    return {
      says: t('now.toSign'),
      act: { label: t('now.goSign'), pane: 'sign', onPress: () => go('sign') },
      tone: 'act',
    };
  }

  if (passage.settled) {
    return {
      says: signed ? t('now.haveSigned') : say(passage.settled),
      tone: 'waiting',
    };
  }

  const step = passage.next;
  if (!step) {
    // Nothing open and nothing settled: the matter waits on a clock.
    return { says: say(passage.waiting?.note), whose: passage.waiting?.on, tone: 'waiting' };
  }

  /*
   * Already spoken. The board is still collecting positions, so the step is
   * genuinely open — it is just not open to this member any more, and telling
   * them to vote again would be asking for something the route refuses.
   */
  if (step.key === 'positions' && voted) {
    return { says: t('now.haveVoted'), standing: say(step.standing), tone: 'waiting' };
  }

  const where = WHERE[step.key];

  /*
   * Placed with a colleague. The step is the board's and this member could
   * press it — the route would let them — but it is with somebody, and a card
   * shouting *do this* in lapis at five members for one member's work is how
   * two people end up answering the same condition. It names whom it is with.
   */
  if (step.who && step.who !== mine) {
    return {
      says: say(step.act),
      standing: say(step.standing),
      who: step.who,
      tone: 'waiting',
    };
  }

  if (!theirs(step.whose, identity) || !where) {
    return {
      says: say(step.act),
      standing: say(step.standing),
      whose: step.whose,
      tone: 'waiting',
    };
  }

  return {
    says: say(step.act),
    standing: say(step.standing),
    act: { label: t(where.label), pane: where.pane, onPress: () => go(where.pane) },
    tone: 'act',
  };
}

export default function NextAct({ doing, children }: { doing: Doing; children?: ReactNode }) {
  const { t } = useI18n();
  const members = useMembers();
  const loud = doing.tone === 'act';

  return (
    <div
      className={
        'mb-8 rounded-sheet px-6 py-5 shadow-card sm:px-7 sm:py-6 ' +
        (loud ? 'bg-lapis text-white' : 'bg-raised')
      }
    >
      <div
        className={
          'mb-2 text-label font-bold uppercase tracking-caps ' +
          (loud ? 'text-white/80' : 'text-muted')
        }
      >
        {t('now.title')}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <p className={'max-w-[52ch] text-lead leading-snug ' + (loud ? 'text-white' : 'text-paper')}>
          {doing.says}
        </p>
        {/* Whom it is with, where it is not with you — the person where there is one. */}
        {doing.who ? (
          <span className="rounded-full bg-black/[0.045] px-2.5 py-0.5 text-label font-bold uppercase tracking-label text-sand">
            {t('hold.with', { name: nameOf(members, doing.who) })}
          </span>
        ) : doing.whose && (
          <span className="rounded-full bg-black/[0.045] px-2.5 py-0.5 text-label font-bold uppercase tracking-label text-sand">
            {t(`passage.whose.${doing.whose}`)}
          </span>
        )}
      </div>

      {/* What is in the way, in the spine's own words. */}
      {doing.standing && (
        <p
          className={
            'mt-2 max-w-[62ch] text-ui leading-relaxed ' + (loud ? 'text-white/80' : 'text-muted')
          }
        >
          {doing.standing}
        </p>
      )}

      {doing.act && (
        <Button
          type="button"
          onClick={doing.act.onPress}
          className={
            'mt-4 rounded-card px-6 py-3 text-body font-bold shadow-act ' +
            (loud ? 'bg-white text-lapis' : 'bg-lapis text-white')
          }
        >
          {doing.act.label}
        </Button>
      )}

      {children}
    </div>
  );
}
