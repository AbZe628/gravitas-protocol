import type { Store } from './store.js';
import type { Pulse } from '../services/pulse.js';

/**
 * The store, wrapped so that no act can change the record quietly.
 *
 * ── why here and not at the 74 acts ───────────────────────────────────────
 *
 * Every one of the seventy-four things a member can do ends in a call to this
 * store. Putting the bell at each of them would mean seventy-four chances to
 * forget one, and the act that got forgotten would be invisible: the record
 * would be right, and only the bell would be wrong, which is the hardest kind
 * of fault to notice. Putting it here means an act cannot land without the
 * bell hearing it, including acts written after this.
 *
 * ── the reader list is the part that has to be right ──────────────────────
 *
 * Classification is inverted on purpose. A method is a reader only if it is
 * named here; everything else is treated as a write. Get it wrong one way and
 * a member sits looking at a stale screen. Get it wrong the other way and the
 * bell rings for a read — which was believed to be the harmless mistake, and
 * is not: a screen that re-reads when the bell rings, reading something that
 * rings it, reads itself for ever. `assignments` was left off this list, the
 * arrival queue reads assignments, and the queue sat on *Loading…* sending
 * the same request as fast as the browser could.
 *
 * `pulse.test.ts` checks that every method is in this list or reached by the
 * wrapper, which a misfiled reader passes. `reading-is-quiet.test.ts` is the
 * one that holds: it calls every GET the application registers and fails if
 * any of them asked the store for something not on this list.
 */
const READERS: ReadonlySet<string> = new Set([
  'institutions', 'institution',
  'boards', 'board',
  'rules', 'rule',
  'matters', 'matter',
  'briefings', 'briefing',
  'incidents', 'incident',
  'assets', 'asset',
  'computations', 'computation',
  'meetings', 'meeting',
  'examinations', 'examination',
  'signings',
  'devices', 'device',
  'credential',
  'undertakings', 'undertaking',
  'committees', 'committee',
  'referrals', 'referral',
  'annotations', 'annotation',
  'submissions', 'submission',
  'adoptions', 'adoption',
  'exchanges', 'exchange',
  'settings',
  'assignments',
  'putOffs',
  'assistantLog',
]);

export function isReader(name: string): boolean {
  return READERS.has(name);
}

export function pulsing(store: Store, pulse: Pulse): Store {
  return new Proxy(store, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function' || typeof property !== 'string') return value;
      if (isReader(property)) return value.bind(target);

      return (...args: unknown[]) => {
        const out = (value as (...a: unknown[]) => unknown).apply(target, args);
        /*
         * After the write lands, never before. A rejected act did not move the
         * record, and a bell that rang for it would send every open screen to
         * re-read something that had not changed — and, worse, would teach a
         * member that the bell means nothing.
         */
        if (out instanceof Promise) {
          return out.then((settled) => {
            pulse.moved();
            return settled;
          });
        }
        pulse.moved();
        return out;
      };
    },
  });
}
