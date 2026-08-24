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

import { hasLapsed, lapse } from './lifecycle.js';
import type { Store } from '../store/index.js';
import type { Matter } from '../types.js';

export interface Swept {
  /** Matters moved to `lapsed` by this run. */
  lapsed: Matter[];
  checkedAt: string;
}

export async function sweep(store: Store, now: () => string = () => new Date().toISOString()): Promise<Swept> {
  const at = now();
  const lapsedNow: Matter[] = [];

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
        return lapse(current);
      });
      if (updated.status === 'lapsed') lapsedNow.push(updated);
    } catch {
      // A matter deleted or already moved on between the two reads is not an
      // error; the next sweep sees whatever is true then.
    }
  }

  return { lapsed: lapsedNow, checkedAt: at };
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
