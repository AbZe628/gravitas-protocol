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
import { TenantStore } from './tenant.js';
import type { Store } from './store.js';

export { FileStore } from './file.js';
export { MemoryStore } from './memory.js';
export { NotFound, ASSISTANT_LOG_MAX, type Store } from './store.js';

/**
 * Hand back a store that can only see one institution.
 *
 * Which one comes from `MAJLIS_INSTITUTION`, or from the record itself when it
 * holds exactly one and there is nothing to be ambiguous about.
 *
 * **Where the record holds several and nothing says which, this refuses to
 * start.** Serving unscoped data across institutions is the single failure this
 * whole boundary exists to prevent, and a service that starts and then leaks is
 * worse than one that does not start.
 */
export async function scopeToInstitution(store: Store): Promise<TenantStore> {
  const named = process.env.MAJLIS_INSTITUTION?.trim();
  const all = await store.institutions();

  if (named) {
    if (!all.some((i) => i.id === named)) {
      throw new Error(
        `MAJLIS_INSTITUTION is "${named}" and the record holds no institution with that id. ` +
          `It holds: ${all.map((i) => i.id).join(', ') || 'none'}.`,
      );
    }
    return new TenantStore(store, named);
  }

  if (all.length === 1) return new TenantStore(store, all[0].id);

  if (all.length === 0) {
    throw new Error(
      'The record holds no institution. Every board belongs to one — see ' +
        'apps/majlis/server/src/store/tenant.ts for why.',
    );
  }

  throw new Error(
    `The record holds ${all.length} institutions and MAJLIS_INSTITUTION does not say which this ` +
      'service is for. Refusing to start rather than serving them all through one door.',
  );
}

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
