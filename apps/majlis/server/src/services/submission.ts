/**
 * The way into Majlis, and what the board does with what arrives.
 *
 * A submission is a question the institution put. It is not a matter: a matter
 * is the board's own act, with the board's own wording, and turning one into
 * the other is a decision a named member takes. Keeping them apart is the whole
 * point of this file.
 *
 * **Nothing here rewrites the question.** The board's reading of it becomes the
 * matter's title and proposal; the institution's wording stays exactly as it
 * was submitted, beside it. A board that answers a rephrased question has
 * answered a different one, and the rephrasing is precisely where a compliance
 * desk's meaning is lost.
 *
 * **Nothing here notifies anybody.** Composing what a member should be told
 * belongs to `services/notice.ts`, which says plainly when this installation
 * cannot send it. A service that quietly assumed a notification went out would
 * be making the one promise this application cannot keep.
 *
 * Append-only, like every other record: dispositions accumulate, and the one
 * that stands is the last of them. Nothing is edited and nothing is removed.
 */

import { Refused } from './lifecycle.js';
import type { Disposition, Submission } from '../types.js';

/** The shortest question that could be answered. Below this it is a subject line. */
export const MIN_QUESTION = 20;

/** A decline the institution cannot learn anything from is not an answer. */
export const MIN_REASON = 20;

export type Standing = 'waiting' | 'opened' | 'declined' | 'withdrawn';

/**
 * Where a submission stands, derived rather than stored.
 *
 * The chain is the array: the last disposition is the current one. There is no
 * status field to fall out of step with the dispositions that produced it —
 * the same rule the rest of the record follows, for the same reason.
 */
export function standingOf(submission: Submission): Standing {
  const last = submission.dispositions[submission.dispositions.length - 1];
  return last ? last.kind : 'waiting';
}

/** The matter it became, where it became one. */
export function matterOf(submission: Submission): string | null {
  for (let i = submission.dispositions.length - 1; i >= 0; i--) {
    const d = submission.dispositions[i];
    if (d.kind === 'opened' && d.matterId) return d.matterId;
  }
  return null;
}

/**
 * How long the institution has been waiting, in whole hours.
 *
 * Measured from `arrivedAt` — when they actually asked — and not from when the
 * record heard about it. A submission the secretary entered a week after the
 * email came in has been waiting a week, and reporting it as new would flatter
 * the board with the secretary's delay.
 *
 * Stops at the disposition. A question answered in three days did not keep
 * waiting afterwards.
 */
export function waitedHours(submission: Submission, now: string): number {
  const last = submission.dispositions[submission.dispositions.length - 1];
  const until = last ? last.at : now;
  const ms = Date.parse(until) - Date.parse(submission.arrivedAt);
  return ms > 0 ? Math.floor(ms / 3_600_000) : 0;
}

export interface OpenInput {
  subject: string;
  question: string;
  background: string;
  awaiting: string;
  askedBy: string;
  attachments: string[];
  /** When the desk actually asked. Defaults to now where the asker is submitting. */
  arrivedAt?: string;
}

/**
 * Put a question. Refuses the two things that make a submission useless.
 *
 * A question too short to answer, and — where a member is entering it for
 * somebody else — no name for who actually asked. The second matters more than
 * it looks: a board is entitled to know whose question it is answering, and
 * "the bank asked" is not a person anyone can go back to.
 */
export function submit(
  id: string,
  boardId: string,
  institutionId: string,
  by: string,
  onBehalf: boolean,
  input: OpenInput,
  now: string,
): Submission {
  if (input.question.trim().length < MIN_QUESTION) {
    throw new Refused(
      'question_too_short',
      `A question needs at least ${MIN_QUESTION} characters. What is here reads as a subject ` +
        'line, and the board would have to guess at the rest — which is the guessing this is for.',
    );
  }

  if (!input.subject.trim()) {
    throw new Refused('no_subject', 'Give it one line the board can find it by.');
  }

  if (onBehalf && !input.askedBy.trim()) {
    throw new Refused(
      'no_asker',
      'Name who asked. A question entered on somebody’s behalf with nobody named is a question ' +
        'the board cannot go back to, and it is the entering member’s name that ends up on it.',
    );
  }

  /*
   * `arrivedAt` is taken as given, and defaulted to now only where nobody
   * offered one. A member entering an email from last week should say so; a
   * desk submitting its own question is asking at this moment by definition.
   */
  const arrivedAt = input.arrivedAt ?? now;
  if (Date.parse(arrivedAt) > Date.parse(now)) {
    throw new Refused(
      'asked_in_the_future',
      'The date the institution asked cannot be after the date it was recorded.',
    );
  }

  return {
    id,
    boardId,
    institutionId,
    arrivedAt,
    recordedAt: now,
    askedBy: input.askedBy.trim() || by,
    recordedBy: by,
    onBehalf,
    subject: input.subject.trim(),
    question: input.question.trim(),
    background: input.background.trim(),
    awaiting: input.awaiting.trim(),
    attachments: input.attachments,
    dispositions: [],
  };
}

/**
 * What may follow what.
 *
 * A question that has been answered is not answered again, but a decline is
 * genuinely reconsiderable: a desk that comes back having understood the
 * objection, or with the missing document, is the ordinary way this goes, and a
 * system that made them file a fresh question would lose the connection between
 * the two. So `declined → opened` is allowed, and everything else terminal is
 * not.
 *
 * A withdrawal is the institution's own act and ends it. The board does not
 * withdraw somebody else's question — it declines it, and says why.
 */
const MAY_FOLLOW: Record<Standing, Disposition['kind'][]> = {
  waiting: ['opened', 'declined', 'withdrawn'],
  declined: ['opened'],
  opened: [],
  withdrawn: [],
};

function checkTransition(submission: Submission, kind: Disposition['kind']): void {
  const standing = standingOf(submission);
  if (MAY_FOLLOW[standing].includes(kind)) return;

  const said: Record<Standing, string> = {
    waiting: 'is waiting',
    opened: 'has already been opened as a matter',
    declined: 'was declined',
    withdrawn: 'was withdrawn by the institution',
  };

  throw new Refused(
    'wrong_standing',
    `This question ${said[standing]}. ${
      standing === 'opened'
        ? 'What happens to it now happens in the matter it became.'
        : 'It cannot be ' + kind + ' from there.'
    }`,
  );
}

/** The board takes it up. The matter is created by the caller; this records the link. */
export function open(submission: Submission, matterId: string, by: string, now: string): Submission {
  checkTransition(submission, 'opened');
  return {
    ...submission,
    dispositions: [...submission.dispositions, { kind: 'opened', at: now, by, matterId }],
  };
}

/**
 * The board does not take it up, and says why.
 *
 * The reason is compulsory and is the institution's only route to understanding
 * what to do next. A decline with an empty reason is the board refusing to
 * answer and refusing to say why, which is worse for a working relationship
 * than a slow answer.
 */
export function decline(submission: Submission, reason: string, by: string, now: string): Submission {
  checkTransition(submission, 'declined');
  if (reason.trim().length < MIN_REASON) {
    throw new Refused(
      'reason_too_short',
      `A decline carries a reason of at least ${MIN_REASON} characters. The institution has to be ` +
        'able to tell whether to come back with more, or not to come back.',
    );
  }
  return {
    ...submission,
    dispositions: [
      ...submission.dispositions,
      { kind: 'declined', at: now, by, reason: reason.trim() },
    ],
  };
}

/**
 * The institution takes its own question back.
 *
 * Only the institution's own side may do this, which the route enforces — the
 * board declining is not the same act and must not be recorded as though the
 * asker had changed their mind.
 */
export function withdraw(
  submission: Submission,
  reason: string,
  by: string,
  now: string,
): Submission {
  checkTransition(submission, 'withdrawn');
  if (!reason.trim()) {
    throw new Refused(
      'no_reason',
      'Say why it is being withdrawn. A question that leaves the record without a reason is a ' +
        'question the board is left wondering about.',
    );
  }
  return {
    ...submission,
    dispositions: [
      ...submission.dispositions,
      { kind: 'withdrawn', at: now, by, reason: reason.trim() },
    ],
  };
}

/**
 * What is waiting on the board, oldest first.
 *
 * Oldest first because that is the order the queue should be worked in, and a
 * list sorted newest-first quietly buries the question that has been waiting
 * longest — which is the one most likely to have gone wrong.
 */
export function waiting(submissions: Submission[]): Submission[] {
  return submissions
    .filter((s) => standingOf(s) === 'waiting')
    .sort((a, b) => Date.parse(a.arrivedAt) - Date.parse(b.arrivedAt));
}
