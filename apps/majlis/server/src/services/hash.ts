import { createHash } from 'node:crypto';
import type { RuleParameter } from '../types.js';

/**
 * Canonical hash of a set of operative parameters.
 *
 * This is the object a scholar signs in Stage Three. It exists so that the
 * question "was what the board approved the same as what was deployed" is
 * answered by comparison rather than by testimony. Everything below is
 * therefore written for an auditor reading it cold.
 *
 * Canonicalisation rules, which must not change without a version bump:
 *
 *   1. A fixed domain tag is hashed first, so that a signature over these
 *      parameters can never be replayed as a signature over some other
 *      structure that happens to canonicalise to the same bytes.
 *   2. Only `key` and `value` participate. `meaning` and `unit` are
 *      presentation and are deliberately excluded, so that a wording
 *      improvement does not invalidate an approval already given.
 *   3. Both key and value are Unicode-normalised to NFC. Two strings that
 *      display identically must hash identically; Arabic and other
 *      non-Latin text routinely arrives in more than one normal form.
 *   4. Parameters are sorted by key in UTF-8 byte order, so that the order
 *      in which a drafter happened to type them is not part of what is
 *      signed.
 *   5. Duplicate keys are rejected rather than resolved. There is no correct
 *      answer to "which of these two values did the board mean".
 *   6. Keys and values may not contain C0 control characters, which includes
 *      both separators. This is what stops a value from impersonating a
 *      field boundary — see the note on version 2 below.
 *   7. SHA-256 over UTF-8, hex, `0x`-prefixed.
 *
 * VERSION 2 — separator injection.
 *
 * Version 1 validated the key for separator characters but not the value.
 * A single parameter whose value contained the separators, e.g.
 *
 *     [ { key: 'a', value: '1<RS>b<US>2' } ]
 *
 * canonicalised to exactly the same bytes as two clean parameters
 *
 *     [ { key: 'a', value: '1' }, { key: 'b', value: '2' } ]
 *
 * and therefore produced the same hash. Two materially different rules
 * shared one signature. Version 2 rejects control characters in both
 * fields, adds the domain tag, and normalises to NFC. Hashes computed
 * under version 1 do not carry over, which is the point of the version tag.
 */
export const HASH_VERSION = 2 as const;

/** Domain separation. Present so this hash cannot be confused with another. */
const DOMAIN = 'gravitas.majlis.rule-parameters';

const FIELD_SEP = '\u001f'; // ASCII unit separator
const RECORD_SEP = '\u001e'; // ASCII record separator

/** Any C0 control character, which includes both separators above. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function checkField(label: 'key' | 'value', keyForMessage: string, s: string): void {
  if (typeof s !== 'string') {
    throw new Error(`parameter ${label} must be a string: ${keyForMessage}`);
  }
  if (CONTROL_CHARS.test(s)) {
    throw new Error(
      `illegal control character in parameter ${label}: ${JSON.stringify(keyForMessage)}`,
    );
  }
}

/** UTF-8 byte order, so the documented rule and the code agree. */
function compareUtf8(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export function canonicalise(parameters: RuleParameter[]): string {
  const normalised = parameters.map((p) => {
    checkField('key', p.key, p.key);
    checkField('value', p.key, p.value);
    return { key: p.key.normalize('NFC'), value: p.value.normalize('NFC') };
  });

  const seen = new Set<string>();
  for (const p of normalised) {
    if (seen.has(p.key)) {
      throw new Error(`duplicate parameter key: ${p.key}`);
    }
    seen.add(p.key);
  }

  const sorted = normalised.sort((a, b) => compareUtf8(a.key, b.key));

  return (
    `${DOMAIN}` +
    RECORD_SEP +
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
 * The hash together with the scheme that produced it. Store both. A bare hash
 * cannot be told apart from one computed under a different version, which is
 * precisely the confusion the version tag exists to prevent.
 */
export function hashParametersVersioned(parameters: RuleParameter[]): {
  hash: string;
  hashVersion: typeof HASH_VERSION;
  algorithm: 'sha256';
  domain: string;
} {
  return {
    hash: hashParameters(parameters),
    hashVersion: HASH_VERSION,
    algorithm: 'sha256',
    domain: DOMAIN,
  };
}

/**
 * Verify that a set of parameters produces a claimed hash. Used wherever the
 * application displays "approved" against "deployed". Returns false rather
 * than throwing, because a malformed parameter set is a failed verification,
 * not a crash in a page a scholar is reading.
 */
export function verifyParameters(parameters: RuleParameter[], claimedHash: string): boolean {
  try {
    return hashParameters(parameters).toLowerCase() === claimedHash.toLowerCase();
  } catch {
    return false;
  }
}
