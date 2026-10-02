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
import type { QueueRow } from './queue.js';

export type NoticeKind = 'none' | 'smtp';

/**
 * Where this installation is, so a link in a message can be followed.
 *
 * A notice is read in a mail client, and a bare `/matters/m-2026-07-03` is
 * not a thing anybody can open from one. The address is the installation’s and
 * this process is not told it unless somebody sets `MAJLIS_ORIGIN` — the same
 * setting the device registration needs, and for the same reason: the Host
 * header a caller happens to send is whatever the caller chose.
 *
 * Absent is a real answer. The notice then carries the path and says the
 * installation has not been told its own address, rather than printing a
 * guess that lands nowhere or a link to localhost.
 */
export type Where = string | null;

/**
 * How much of a row may travel in a notice.
 *
 * ── the rule, and it is not a preference ──────────────────────────
 *
 * A notice leaves this application and goes through whatever mail system a
 * bank happens to run. The title of a waiting thing is the substance: *Profit
 * paid on a deposit before the underlying settled*, *A wakala deployment
 * outside the approved categories*. Put in a subject line, that is the
 * institution’s compliance position in somebody’s inbox, forwarded, searched
 * and backed up outside the record.
 *
 * So a summary carries **the count, what kind of act each one wants, and where
 * to open it**, and nothing else. Which is enough: a member who reads *three
 * things are waiting on you* opens the application, and the application is
 * where the substance lives and is already behind a credential.
 *
 * It also carries **nothing about who holds what**. A board whose members can
 * be approached one at a time about work in their hands is not independent in
 * the way the bank is paying for, and a notice naming holders would put that
 * outside the fence `visibleTo` keeps inside it.
 */
export interface WaitingLine {
  /** Where it opens. An address, which is not substance. */
  to: string;
  /** What kind of thing it is. Never its title. */
  kind: QueueRow['kind'];
  /** Whether a clock has run out on it. */
  overdue: boolean;
  /** Whole days it has waited. */
  days: number;
}

/** What happened that a member would want to know about. */
export type NoticeEvent =
  | { kind: 'submission_arrived'; submission: Submission }
  /**
   * What is waiting on one member, for somebody who has not opened this in a
   * week.
   *
   * The gap it closes is the one `attention.ts` names in its own header: Majlis
   * answers *what needs you* perfectly well and only to somebody already
   * looking at it. A question from the institution can sit for a week because
   * nobody happened to open the application, and the board's pace figure — the
   * one this product is sold on — carries every one of those days.
   *
   * `lines` carries no titles; see `WaitingLine`.
   */
  | { kind: 'waiting_on_you'; scholarId: string; lines: WaitingLine[]; at: Where }
  /**
   * Work placed with a named member, told to that member.
   *
   * Placing work with somebody who is not in the room is otherwise a thing
   * that happens entirely without them: the record says they are carrying it
   * and the first they hear of it is the next time they open the application.
   */
  | { kind: 'placed_with_you'; scholarId: string; by: string; ofKind: QueueRow['kind']; to: string; at: Where }
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
/**
 * Said rather than guessed.
 *
 * An installation that has not been told its own address gets the path and
 * this sentence. A link to localhost in somebody's inbox is worse than no
 * link, because it looks like one that should work.
 */
const NO_ADDRESS =
  'These are paths within Majlis rather than links: this installation has not been ' +
  'told its own address (MAJLIS_ORIGIN), so nothing here can write one.';

/**
 * How long it has stood, in words.
 *
 * `0 days` is what the figure says and is not what anybody would write. Three
 * rulings came due this morning and the summary read *a ruling due to come
 * back — 0 days*, three times, which is the sort of line a member stops
 * reading these over.
 */
function age(days: number): string {
  if (days === 0) return 'today';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** What each kind of waiting thing is, for a member reading it in a mailbox. */
export const KIND_IN_WORDS: Record<QueueRow['kind'], string> = {
  question: 'A question from the institution',
  matter: 'A matter before the board',
  review: 'A ruling due to come back',
  breach: 'An event to determine',
  undertaking: 'Something you undertook',
};

export function compose(board: Board, event: NoticeEvent): Notice {
  const everyone = board.members.map((m) => m.id);
  /*
   * A member by name. The routes hand over who acted as a scholar id, which is
   * right for the record and wrong for a sentence a person reads: the notice
   * said *member-a opened a matter for the board's deliberation*. The id only
   * where the board does not know them, because somebody did act.
   */
  const named = (id: string) => board.members.find((m) => m.id === id)?.name || id;

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
        `${named(event.openedBy)} opened a matter for the board’s deliberation.\n\n` +
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
    /*
     * The hour, with the zone it is in.
     *
     * The record holds an instant, which is right, and this printed it raw:
     * a chair in Sarajevo typed 14:00 into the form, pressed convene, and the
     * notice they were about to send read *2026-11-12 13:00* with nothing
     * beside it. Found by convening a sitting and reading the words the
     * screen offered to copy.
     *
     * Said as UTC rather than converted. This process has no idea what zone
     * the board sits in, and a converted hour would be this file guessing at
     * one — which is worse than an hour that says which it is, on a board
     * whose members are routinely in three countries.
     */
    const when = event.at.replace('T', ' ').slice(0, 16) + ' UTC';
    return {
      subject: `${board.name} will sit on ${event.at.slice(0, 10)}`,
      body:
        `${named(event.convenedBy)} has called a sitting of the board.\n\n` +
        `${when}\n\n` +
        (event.agenda.length > 0
          ? `Before the board:\n${event.agenda.map((item) => `  · ${item}`).join('\n')}\n`
          : '') +
        `\nThe papers for the sitting are assembled in Majlis. Attendance is ` +
        `recorded there afterwards, and a quorum is counted from it.`,
      concerns: everyone,
    };
  }

  if (event.kind === 'waiting_on_you') {
    /*
     * Kinds and clocks, never titles. See `WaitingLine`: the title of a
     * waiting thing is the institution's compliance position, and a summary
     * that carried it would put that in an inbox, forwarded and searched
     * outside the record.
     */
    const late = event.lines.filter((l) => l.overdue).length;
    const oldest = event.lines.reduce((n, l) => Math.max(n, l.days), 0);

    return {
      subject:
        event.lines.length === 1
          ? `One thing is waiting on you at ${board.name}`
          : `${event.lines.length} things are waiting on you at ${board.name}`,
      body:
        `This is what stands with you now.\n\n` +
        event.lines
          .map(
            (l) =>
              `  · ${KIND_IN_WORDS[l.kind]} — ${age(l.days)}` +
              `${l.overdue ? ', past its date' : ''}\n    ${(event.at ?? '') + l.to}`,
          )
          .join('\n') +
        `\n\n` +
        (late > 0
          ? `${late === 1 ? 'One of them is' : `${late} of them are`} past the date the board set.\n`
          : '') +
        (oldest > 0 ? `The longest has waited ${oldest} days.\n` : '') +
        (event.at === null ? `\n${NO_ADDRESS}\n` : '') +
        `\nWhat each one is, and everything about it, is in Majlis. This says ` +
        `only that something stands with you and where to open it: what the ` +
        `board is looking at is not a thing to put in a mail system.`,
      concerns: [event.scholarId],
    };
  }

  if (event.kind === 'placed_with_you') {
    return {
      subject: `${named(event.by)} has placed work with you`,
      body:
        `${named(event.by)} has placed something with you at ${board.name}.\n\n` +
        `  · ${KIND_IN_WORDS[event.ofKind]}\n    ${(event.at ?? '') + event.to}\n\n` +
        (event.at === null ? `${NO_ADDRESS}\n\n` : '') +
        `Nothing about it has been decided by placing it, and it is still ` +
        `whatever it was. What changed is whose it is.`,
      concerns: [event.scholarId],
    };
  }

  if (event.kind === 'vote_opened') {
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

  /*
   * A kind nobody wrote words for.
   *
   * The vote's notice used to be the fall-through, so a new kind added to
   * `NoticeEvent` and not given a branch here would have been sent as a vote
   * notice about an undefined matter — composed, delivered, and wrong, with
   * nothing failing anywhere. The compiler refuses the assignment instead.
   */
  const unwritten: never = event;
  throw new Error(`No words are written for a notice of kind ${(unwritten as { kind: string }).kind}.`);
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
