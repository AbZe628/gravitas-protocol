/**
 * Telling a member, outside the application, that something arrived.
 *
 * Majlis already answers *what needs you* from the record — `attention.ts`
 * derives it rather than keeping a queue, deliberately, because a second copy
 * of the truth drifts. That is not the gap. The gap is that a scholar has to
 * open the application to find out, and a question from the institution can sit
 * for a week because nobody happened to look.
 *
 * ── an adapter, whose default is nothing ──────────────────────────────────
 *
 * The same shape as `enforcement.ts`, for the same reason. Most installations
 * will have no channel wired: a bank's mail relay needs its own credentials,
 * its own sender, and a decision about what may leave the building. So the
 * default is `none`, and `none` is not a degraded state.
 *
 * **What `none` does is compose the notice and hand it to a person.** The
 * screen shows the words and offers them to copy; a secretary sends them the
 * way that institution already sends things. What it never does is imply that
 * anything was sent. A board that believed its members had been told, when
 * nobody had, would be worse off than one that knows it has to pick up a phone
 * — and that belief is the exact failure this file is arranged to prevent.
 *
 * Nothing here holds an address book either. Who to tell is the board's own
 * membership, which the record already knows; how to reach them is the
 * institution's business and, for `none`, never leaves the screen.
 */

import type { Board, Submission } from '../types.js';

export type NoticeKind = 'none' | 'smtp';

/** What happened that a member would want to know about. */
export type NoticeEvent =
  | { kind: 'submission_arrived'; submission: Submission }
  | { kind: 'matter_opened'; matterId: string; title: string; openedBy: string }
  | { kind: 'vote_opened'; matterId: string; title: string; closesAt: string | null }
  /**
   * The board has ruled and the ruling is in force.
   *
   * The one event of the four that ends something rather than starting it,
   * and the one that was missing. A question arriving composed a notice; a
   * question being *answered* composed nothing at all, so the moment the
   * board's work actually produced its result was the moment nobody was
   * told.
   *
   * `reference` is the board's own series — the thing a bank files under and
   * a regulator asks for. Null where the board has set no pattern, and the
   * notice then says so rather than printing an internal id as though it
   * were a citation.
   */
  | {
      kind: 'ruling_in_force';
      matterId: string;
      title: string;
      reference: string | null;
      direction: 'permit' | 'restrict';
    }
  /**
   * The board has been called to sit.
   *
   * The one event on this list that asks a member to be somewhere, and the
   * only one where being told late is the same as not being told. A sitting
   * convened for Tuesday is of no use to a member who opens Majlis on
   * Wednesday.
   *
   * Two things go with it and nothing else: **when**, and **what it is
   * about**. The agenda is already a list of headings the board wrote for
   * each other, so it travels as it stands — unlike a question's substance,
   * which does not leave the record.
   *
   * A member who has made a calendar address does not need this at all: the
   * sitting is in their calendar before anybody writes to them. This is for
   * the ones who have not, and for the record of having told them.
   */
  | {
      kind: 'meeting_convened';
      meetingId: string;
      at: string;
      agenda: string[];
      convenedBy: string;
    };

/**
 * The notice itself: a subject, a body, and who it concerns.
 *
 * Composed here rather than in the interface so that the words are the same
 * whether they are sent by a configured channel or read off a screen and pasted
 * into an email. Two wordings for one event is how a record and a mailbox start
 * disagreeing.
 */
export interface Notice {
  subject: string;
  body: string;
  /** Board member ids this concerns. Names, not addresses — see the header. */
  concerns: string[];
}

export interface Delivery {
  kind: NoticeKind;
  /** False where nothing is wired. The notice still exists; it was not sent. */
  configured: boolean;
  /**
   * Whether this actually went anywhere.
   *
   * Always false under `none`, and the interface must say so in words rather
   * than leaving it to be inferred from a quiet screen.
   */
  sent: boolean;
  at: string;
  /** How many members it reached, where it was sent. */
  reached?: number;
  /** Why it did not, in the words the underlying system used. */
  error?: string;
}

export interface Notifier {
  readonly kind: NoticeKind;
  /**
   * Hand over a composed notice.
   *
   * Under `none` this records that nothing was sent and returns the notice for
   * a person to carry. It does not throw: not having a channel is the ordinary
   * arrangement, not a failure.
   */
  deliver(notice: Notice, now: string): Promise<Delivery>;
}

// ── composing ─────────────────────────────────────────────────────────────

/**
 * The words, for one event.
 *
 * Deliberately short, and deliberately without the substance of the question.
 * A notice travels through whatever mail system a bank happens to use, and the
 * text of a compliance question about a named counterparty should not be the
 * thing that leaks. It says that something is waiting and where to see it; the
 * record stays in the record.
 */
export function compose(board: Board, event: NoticeEvent): Notice {
  const everyone = board.members.map((m) => m.id);

  if (event.kind === 'submission_arrived') {
    const s = event.submission;
    return {
      subject: `A question for ${board.name}: ${s.subject}`,
      body:
        `${s.askedBy} has put a question to the board.\n\n` +
        `Subject: ${s.subject}\n` +
        `Asked: ${s.arrivedAt.slice(0, 10)}\n` +
        (s.awaiting ? `They are waiting to: ${s.awaiting}\n` : '') +
        `\nIt is waiting to be opened as a matter or declined with a reason. ` +
        `The question itself is in Majlis, in the words it was put in.`,
      concerns: everyone,
    };
  }

  if (event.kind === 'matter_opened') {
    return {
      subject: `Opened for deliberation: ${event.title}`,
      body:
        `${event.openedBy} opened a matter for the board’s deliberation.\n\n` +
        `${event.title}\n\n` +
        `Nothing is decided by opening it. What it needs now is what the board says about it.`,
      concerns: everyone,
    };
  }

  if (event.kind === 'ruling_in_force') {
    return {
      subject: `${board.name} has ruled: ${event.title}`,
      body:
        `The board has ruled, and the ruling is in force.\n\n` +
        `${event.title}\n` +
        `${event.direction === 'permit' ? 'Permitted' : 'Restricted'}\n` +
        (event.reference
          ? `Filed as: ${event.reference}\n`
          : `This board has set no reference series, so it is filed under its own id.\n`) +
        `\nThe written ruling and the draft clauses are assembled and waiting in ` +
        `Majlis. Nothing has been sent to the institution by this system — that ` +
        `is a person's act, and this notice is the prompt for it.`,
      concerns: everyone,
    };
  }

  if (event.kind === 'meeting_convened') {
    const when = event.at.replace('T', ' ').slice(0, 16);
    return {
      subject: `${board.name} will sit on ${event.at.slice(0, 10)}`,
      body:
        `${event.convenedBy} has called a sitting of the board.\n\n` +
        `${when}\n\n` +
        (event.agenda.length > 0
          ? `Before the board:\n${event.agenda.map((item) => `  · ${item}`).join('\n')}\n`
          : '') +
        `\nThe papers for the sitting are assembled in Majlis. Attendance is ` +
        `recorded there afterwards, and a quorum is counted from it.`,
      concerns: everyone,
    };
  }

  return {
    subject: `The vote is open: ${event.title}`,
    body:
      `Voting has opened on a matter before ${board.name}.\n\n` +
      `${event.title}\n\n` +
      (event.closesAt ? `The timelock ends ${event.closesAt.slice(0, 10)}.\n\n` : '') +
      `The operative terms are fixed as of now, and a position recorded from here ` +
      `is recorded against them. A position needs a reason.`,
    concerns: everyone,
  };
}

// ── the adapters ──────────────────────────────────────────────────────────

/**
 * No channel. The notice is composed and handed back for a person to send.
 *
 * This is not a stub standing in for a real implementation. It is the ordinary
 * installation, and it is honest in a way a silent success would not be: the
 * caller gets `sent: false` and has to say so.
 */
export class NoticeOff implements Notifier {
  readonly kind: NoticeKind = 'none';

  async deliver(_notice: Notice, now: string): Promise<Delivery> {
    return { kind: 'none', configured: false, sent: false, at: now };
  }
}

/**
 * Read the channel from the environment.
 *
 * `MAJLIS_NOTICE=none` is the default and the value to leave alone. Anything
 * else needs credentials that belong to the institution and are never held
 * here; until one is written, an unknown value falls back to `none` rather than
 * failing to boot — a bank that mistypes a setting should get an application
 * that works and says it is not sending, not one that will not start.
 */
export function notifierFromEnv(env: NodeJS.ProcessEnv = process.env): Notifier {
  const kind = (env.MAJLIS_NOTICE ?? 'none').trim().toLowerCase();
  if (kind === 'none' || kind === '') return new NoticeOff();

  /*
   * `smtp` is declared in the type and deliberately not implemented. Wiring it
   * needs the institution's own relay, sender and policy on what may leave the
   * building, and none of that is guessable from here. Falling back to `none`
   * keeps the promise the rest of this file makes: nothing ever claims to have
   * been sent.
   */
  return new NoticeOff();
}
