import { createHash } from 'node:crypto';
import type { RuleParameter } from '../types.js';

/**
 * Canonical hash of a set of operative parameters.
 *
 * This is the object a scholar signs in Stage Three. It exists so that the
 * question "was what the board approved the same as what was deployed" is
 * answered by comparison rather than by testimony.
 *
 * Canonicalisation rules, which must not change without a version bump:
 *   - parameters sorted by key, ascending, byte order
 *   - only key and value participate; `meaning` and `unit` are presentation
 *     and are deliberately excluded, so that a wording improvement does not
 *     invalidate an approval
 *   - fields joined with a unit separator that cannot appear in a key
 *   - SHA-256, hex, prefixed
 */
export const HASH_VERSION = 1 as const;

const FIELD_SEP = '\u001f';
const RECORD_SEP = '\u001e';

export function canonicalise(parameters: RuleParameter[]): string {
  const sorted = [...parameters].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const seen = new Set<string>();
  for (const p of sorted) {
    if (seen.has(p.key)) {
      throw new Error(`duplicate parameter key: ${p.key}`);
    }
    if (p.key.includes(FIELD_SEP) || p.key.includes(RECORD_SEP)) {
      throw new Error(`illegal character in parameter key: ${p.key}`);
    }
    seen.add(p.key);
  }
  return (
    `v${HASH_VERSION}` +
    RECORD_SEP +
    sorted.map((p) => `${p.key}${FIELD_SEP}${p.value}`).join(RECORD_SEP)
  );
}

export function hashParameters(parameters: RuleParameter[]): string {
  const canonical = canonicalise(parameters);
  return '0x' + createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Verify that a set of parameters produces a claimed hash. Used wherever the
 * application displays "approved" against "deployed".
 */
export function verifyParameters(parameters: RuleParameter[], claimedHash: string): boolean {
  try {
    return hashParameters(parameters).toLowerCase() === claimedHash.toLowerCase();
  } catch {
    return false;
  }
}
