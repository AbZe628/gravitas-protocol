/**
 * A number that goes up whenever the record changes, and who is listening.
 *
 * ── why a number and not a list of notifications ──────────────────────────
 *
 * The obvious build is a table of notifications: a matter is voted on, a row
 * is written for each member, the bell reads the rows. Every part of this
 * application refuses that shape for the same reason, and `attention.ts` says
 * it plainly: *a stored list is a second copy of the truth, and a second copy
 * drifts.* A matter is withdrawn and the notification stays. A member votes
 * and the notification stays. The process is rebuilt and the notifications
 * describe the old one.
 *
 * So nothing about *what happened* is kept here. What is kept is a single
 * count of how many times the record has moved. A client that holds a copy of
 * its own attention list learns the count has changed, asks for the list
 * again, and works out for itself what is new by comparing the two. The truth
 * stays in one place and the bell cannot disagree with it.
 *
 * ── what this is not ──────────────────────────────────────────────────────
 *
 * It is not delivery. There is no mail and no push, for the reason
 * `attention.ts` already gives: a service that sends mail needs an account, a
 * sender domain and a deliverability problem, and a bell that claimed to have
 * told somebody while doing nothing would be worse than no bell. This reaches
 * a member who has the application open, and says so.
 *
 * It does not survive a restart, and does not need to. The count is only ever
 * compared with the previous count *in one session*; a client that reconnects
 * and finds a smaller number than it remembers simply re-reads, which is what
 * it would have done anyway.
 *
 * ── one process ───────────────────────────────────────────────────────────
 *
 * This holds its listeners in memory, so it reaches the members connected to
 * *this* copy of the server. Majlis is one installation per bank behind one
 * credential, so that is the whole of it. Two copies behind a load balancer
 * would need the count to come from somewhere both can see, and the shape
 * above does not change — only where the number is kept.
 */

export type Listener = (revision: number) => void;

export interface Pulse {
  /** How many times the record has moved since this process started. */
  revision(): number;
  /** Called after a write lands. */
  moved(): void;
  /** Returns the function that stops listening. */
  listen(listener: Listener): () => void;
  /** How many are connected. The status bar is allowed to be honest about it. */
  listeners(): number;
}

export function createPulse(): Pulse {
  let revision = 0;
  const listeners = new Set<Listener>();

  return {
    revision: () => revision,

    moved() {
      revision += 1;
      /*
       * A copy, because a listener may stop listening while being told — a
       * closing connection does exactly that — and removing from a set that is
       * being walked skips whoever came next.
       */
      for (const listener of [...listeners]) {
        try {
          listener(revision);
        } catch {
          /*
           * One dead connection must not stop the others hearing. A write has
           * already landed by the time this runs; failing here would make the
           * record and the bell disagree, which is the one thing this exists
           * to prevent.
           */
          listeners.delete(listener);
        }
      }
    },

    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    listeners: () => listeners.size,
  };
}
