import { createHash } from 'node:crypto';

/**
 * Which version of a record somebody was looking at.
 *
 * ── the fault this closes ─────────────────────────────────────────────────
 *
 * A board of five people works one matter at the same time — that is the whole
 * point of the product. Until now, two of them recording a finding on the same
 * condition meant the second silently replaced the first: no error, no notice,
 * and the first scholar's reasoning gone from the record with nobody aware it
 * had ever been there. `updateMatter` takes a function rather than a finished
 * object, which stops a stale *whole matter* being written back, but nothing
 * anywhere noticed that the part being changed had moved underneath.
 *
 * ── derived from the record, never stored beside it ───────────────────────
 *
 * The obvious build is a counter on the matter, bumped by every write. This
 * application refuses that shape everywhere else for one reason, and the same
 * reason applies here: a stored number is a second copy of the truth, and a
 * second copy drifts. A write that forgets to bump it makes the version lie in
 * the direction that loses work — the dangerous direction.
 *
 * So the version **is** the content. A fingerprint of the record as it stands:
 * identical content gives an identical version, any change at all gives a
 * different one, and there is nothing to forget to update. It cannot drift
 * because there is nothing to drift from.
 *
 * ── it is deliberately whole-record and not per-field ─────────────────────
 *
 * A finding-level version would let two members write different conditions at
 * once without either being stopped, which sounds better. It is also a promise
 * the software cannot keep: whether one member's finding changes what another
 * was about to write is a question about *the argument*, not about which JSON
 * key moved. A board deciding together should be told the matter moved.
 *
 * What makes that bearable rather than irritating is the reply: a refusal here
 * carries the current version and enough to say **what** changed, so the screen
 * can show both and let the member decide — see `N-04` in docs/FLOW.md. A bare
 * *try again* would be the annoyance; this is a conversation.
 *
 * ── stable ordering, or the version changes for no reason ─────────────────
 *
 * `JSON.stringify` follows insertion order, so the same matter rebuilt with
 * its keys in a different order would fingerprint differently and refuse a
 * write that should have been allowed. Keys are sorted at every depth, which
 * is the same discipline `hash.ts` applies to parameters and for the same
 * reason.
 */

/** Sorted at every depth, so ordering can never change the fingerprint. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonical((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * The version of a record as it stands.
 *
 * Twelve hex characters: long enough that two different matters colliding is
 * not a thing that happens, short enough to sit in a header and be read out.
 */
export function versionOf(record: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(record))).digest('hex').slice(0, 12);
}

/**
 * What moved between two versions of the same record, in field names.
 *
 * Not a diff of the values — a member does not need to be shown JSON. What the
 * refusal screen needs is *which parts of the matter are not as you left them*,
 * so it can say **someone recorded a finding** rather than **the record
 * changed**, and so it can tell a member whether what moved has anything to do
 * with what they were writing.
 */
export function whatMoved(before: unknown, after: unknown): string[] {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [];
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  const moved: string[] = [];
  for (const name of names) {
    if (JSON.stringify(canonical(a[name])) !== JSON.stringify(canonical(b[name]))) {
      moved.push(name);
    }
  }
  return moved.sort();
}
