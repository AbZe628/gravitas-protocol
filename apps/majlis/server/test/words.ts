import { translate } from '../../client/src/locales/index.js';
import type { Say } from '../src/services/passage.js';

/**
 * A sentence the server meant, read as English.
 *
 * ── why a test needs this ─────────────────────────────────────────────────
 *
 * The spine stopped sending finished prose. It sends the key of a sentence
 * and the figures that go in it, and the interface says it in the language
 * the reader chose — which is the whole point, because a board whose minutes
 * are in Arabic was being told what to do next in English.
 *
 * The tests around it assert **meaning**: that an unanswered condition says
 * two of three are outstanding, that a restriction says waiting is the
 * greater risk, that a settled matter says it was refused. That is the right
 * thing for them to assert and none of it changed. Only the place the words
 * now live did, so this reads them from there.
 *
 * ── and it proves the key exists ──────────────────────────────────────────
 *
 * `translate` returns the key itself when the dictionary has no entry, so a
 * step emitting `step.invented.standing` would come back as that string and
 * quietly fail every assertion about its words — which is a loud failure, and
 * the one we want. `everySentenceExists` in `passage.test.ts` makes it
 * louder: it walks every step of every shape of matter and refuses a key the
 * English dictionary does not answer.
 *
 * Importing the client's dictionary from a server test is deliberate. The
 * words are one set for both sides, and a second copy here to test against
 * would be a copy that drifts — which is exactly the fault this migration was
 * undertaken to remove.
 */
export function words(s: Say | null | undefined): string {
  return s ? translate('en', s.key, s.vars) : '';
}

/**
 * Whether the dictionary actually answers this key, rather than echoing it.
 *
 * Used by the guard below `words`. A key with no entry comes back as itself;
 * a key whose entry happens to equal the key would be indistinguishable, and
 * no sentence in the dictionary is a dotted identifier.
 */
export function known(s: Say | null | undefined): boolean {
  if (!s) return true;
  return translate('en', s.key) !== s.key;
}
