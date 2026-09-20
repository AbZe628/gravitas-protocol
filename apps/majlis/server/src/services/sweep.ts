/**
 * Deadlines that pass while nobody is looking.
 *
 * The lifecycle can say whether a restriction's ratification window has closed.
 * Until now nothing asked it. `hasLapsed` and `lapse` existed and were called
 * only from tests, which meant a restriction whose window had closed still read
 * `in_force` — the record said a rule was operative when the board's own rules
 * said it had expired.
 *
 * That is the failure this file exists to prevent, and it is worse than it
 * sounds. A restriction takes effect on a reduced quorum precisely because
 * waiting was the greater risk; it stands only if the full quorum ratifies it
 * in time. One that quietly persists is a rule nobody voted for, which is the
 * outcome the asymmetry was designed to avoid.
 *
 * The sweep is idempotent and writes only what has actually fallen due, so
 * running it often is free and running it late is merely late.
 */

import { bringIntoForce, hasLapsed, lapse, timelockElapsed } from './lifecycle.js';
import type { Store } from '../store/index.js';
import type { Matter } from '../types.js';

export interface Swept {
  /** Matters moved to `lapsed` by this run. */
  lapsed: Matter[];
  /**
   * Permits whose timelock ran out and which this run brought into force.
   *
   * The other half of the same failure, and it was missing. A restriction
   * that outlived its window read as operative when it was not; a permit
   * whose timelock had ended read as *waiting* when the waiting was over.
   * Both are the record disagreeing with the board's own rules, and both
   * used to need somebody to open the right screen and press.
   *
   * A timelock is the system waiting deliberately. When it stops waiting,
   * that is not a decision anybody still has to take — the board took it
   * when it voted. Leaving it to a press makes a ruling's effective date
   * depend on when a member next logged in.
   */
  inForce: Matter[];
  checkedAt: string;
}

export async function sweep(store: Store, now: () => string = () => new Date().toISOString()): Promise<Swept> {
  const at = now();
  const lapsedNow: Matter[] = [];
  const inForceNow: Matter[] = [];

  const boards = new Map((await store.boards()).map((b) => [b.id, b]));

  for (const matter of await store.matters()) {
    if (matter.status !== 'in_force' || matter.direction !== 'restrict') continue;

    const board = boards.get(matter.boardId);
    if (!board) continue;
    if (!hasLapsed(board, matter, at)) continue;

    // Re-checked inside the transaction: between the read above and this write
    // the board may have ratified, and a lapse applied over a ratification
    // would erase a decision the board did take.
    try {
      const updated = await store.updateMatter(matter.id, (current) => {
        if (current.status !== 'in_force' || !hasLapsed(board, current, at)) return current;
        return lapse(current, at);
      });
      if (updated.status === 'lapsed') lapsedNow.push(updated);
    } catch {
      // A matter deleted or already moved on between the two reads is not an
      // error; the next sweep sees whatever is true then.
    }
  }

  /*
   * And the permits whose waiting is over.
   *
   * Done in a second pass with its own list, because a reference is taken
   * from what the board already holds: two permits coming into force in one
   * sweep must take two numbers, so what this run assigns is added to the
   * list the next one reads.
   *
   * `bringIntoForce` carries every guard already — it refuses a matter that
   * is not in timelock, one with an objection standing, and one whose clock
   * is still running — so this asks it rather than re-deciding, and a
   * refusal here is the sweep correctly doing nothing.
   */
  const held = [...(await store.matters())];

  for (const matter of held.filter((m) => m.status === 'timelock')) {
    const board = boards.get(matter.boardId);
    if (!board) continue;
    if (matter.objections.length > 0) continue;
    if (!timelockElapsed(matter, at)) continue;

    try {
      const updated = await store.updateMatter(matter.id, (current) => {
        // Re-checked inside the write: an objection may have been raised
        // between the read above and here, and forcing over one would put
        // into force the very thing an objection halts.
        if (current.status !== 'timelock') return current;
        if (current.objections.length > 0) return current;
        if (!timelockElapsed(current, at)) return current;
        return bringIntoForce(current, at, board, held);
      });

      if (updated.status === 'in_force') {
        inForceNow.push(updated);
        // So the next one in this same sweep takes the next number.
        const i = held.findIndex((m) => m.id === updated.id);
        if (i >= 0) held[i] = updated;
      }
    } catch {
      /* Refused or vanished. The next sweep sees whatever is true then. */
    }
  }

  return { lapsed: lapsedNow, inForce: inForceNow, checkedAt: at };
}

/**
 * Run the sweep now and then on an interval.
 *
 * Returns a stop function. The timer is unref'd so it never holds the process
 * open — a deadline that has passed is still passed when the process next
 * starts, and the sweep is the first thing that runs then.
 */
export function startSweeping(
  store: Store,
  intervalMs = 5 * 60_000,
  onError: (error: unknown) => void = (e) => console.error('sweep failed:', e),
): () => void {
  void sweep(store).catch(onError);

  const timer = setInterval(() => {
    void sweep(store).catch(onError);
  }, intervalMs);
  timer.unref?.();

  return () => clearInterval(timer);
}
