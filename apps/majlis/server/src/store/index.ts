/**
 * Choosing a store.
 *
 * `MAJLIS_DB` names a file and gets the durable one. Absent, the record lives
 * in memory and disappears with the process, which is right for tests and for
 * a development run and wrong for anything else.
 *
 * Production refuses to start without it rather than quietly running on memory.
 * A governance system that silently forgets is worse than one that will not
 * start: the first is discovered by a board looking for a decision that is no
 * longer there, the second by whoever deployed it, thirty seconds later.
 */

import { FileStore } from './file.js';
import { MemoryStore } from './memory.js';
import type { Store } from './store.js';

export { FileStore } from './file.js';
export { MemoryStore } from './memory.js';
export { NotFound, ASSISTANT_LOG_MAX, type Store } from './store.js';

export function storeFromEnv(): Store {
  const file = process.env.MAJLIS_DB?.trim();
  if (file) return new FileStore({ file });

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'MAJLIS_DB is not set. In production the record must be written somewhere it survives a ' +
        'restart; an in-memory store would lose every decision the board took the moment the ' +
        'process ended. Set MAJLIS_DB to a path on a persistent volume.'
    );
  }

  return new MemoryStore();
}
