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
 * named here; everything else is treated as a write. Get that wrong in one
 * direction and a client re-reads a list it already had — nothing is lost. Get
 * it wrong in the other and a member sits looking at a stale screen. So the
 * default is the harmless mistake.
 *
 * `pulsing.test.ts` walks the interface and asserts every method is either in
 * this list or reached by the wrapper, so a method added later cannot slip
 * past by being neither.
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
