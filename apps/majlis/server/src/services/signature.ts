/**
 * Signing a document, and sealing it so it can be checked years later.
 *
 * This is the Web2 signature. Stage Three is the other one — a scholar's own
 * key, held by the scholar, which changes the Policy Registry. That one waits
 * on four answers about key custody. This one does not wait on anything, and a
 * bank filing a ruling with its regulator needs it today.
 *
 * ── what a seal proves, exactly ───────────────────────────────────────────
 *
 * The seal proves two things and no more:
 *
 *   1. The document in the reader's hand is byte-for-byte the decision that
 *      was sealed. One changed figure and the hash no longer matches.
 *   2. These named members signed it, at these times, having proved who they
 *      were in the way each entry states.
 *
 * It does not prove that a member's personal cryptographic key touched it.
 * Nobody holds one yet. What signs is this installation, attesting to an
 * authentication it performed — which is what a document platform does, and
 * what the reader should be told it is. The rendered page says so in those
 * words rather than showing a hex string and letting the reader assume more.
 *
 * ── signing is not voting ─────────────────────────────────────────────────
 *
 * A position is taken on a proposal. A signature is put on a finished
 * document. They are different acts and collapsing them would be wrong in
 * both directions: a member who voted in favour has not yet seen how the
 * decision was written up, and a member who signs is not voting again.
 *
 * So `Signing` is separate from `Reasoning`, and a document can carry
 * positions with no signatures — which is the normal state between the vote
 * closing and the members reading what was drafted.
 *
 * ── no key configured ─────────────────────────────────────────────────────
 *
 * Where no sealing key is set, `seal` returns null and the document prints
 * that it is unsealed. It does not print a seal computed with a default key,
 * and there is no placeholder that looks like one. A control that cannot be
 * honoured is absent, not disabled — the same rule the rest of this
 * application follows.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SEAL_VERSION = 1 as const;

/** Domain separation, so a seal can never be read as some other hash. */
const HASH_DOMAIN = 'gravitas.majlis.document.v1';
const SEAL_DOMAIN = 'gravitas.majlis.seal.v1';

const FIELD_SEP = '\u001f';
const RECORD_SEP = '\u001e';
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * How a signer proved who they were.
 *
 * Printed on the document in full words. An auditor asking "how do you know
 * this was him" gets an answer rather than a checkmark, and the weakest of
 * these reads as weak on the page, which is the honest outcome.
 */
export type SigningProof =
  /** Signed in with their own credential to this installation. */
  | 'their own sign-in'
  /** Their credential and a one-time code sent to them. */
  | 'their own sign-in and a one-time code'
  /** Signed on paper at a sitting; the secretary recorded it here. */
  | 'in person at a sitting, entered by the secretary';

export const PROOFS: readonly SigningProof[] = [
  'their own sign-in',
  'their own sign-in and a one-time code',
  'in person at a sitting, entered by the secretary',
];

export interface Signing {
  scholarId: string;
  /** As it should appear under the signature. */
  name: string;
  title: string;
  at: string;
  provedBy: SigningProof;
  /**
   * The document hash this member signed over.
   *
   * Held per signature rather than once for the document, because a member
   * who signed an earlier draft did not sign this one. Where it differs from
   * the document's own hash the page says so beside their name.
   */
  documentHash: string;
  /**
   * Anything the member wanted recorded with their signature, in their words.
   *
   * Rare, and never composed here. A member who signs "subject to the review
   * date being kept at ninety days" has said something the document must
   * carry.
   */
  note?: string;
}

export interface Seal {
  version: typeof SEAL_VERSION;
  /** Hash of the document's operative content. */
  documentHash: string;
  /** Which installation sealed it. Printed, so a reader knows who attests. */
  issuer: string;
  at: string;
  /** HMAC-SHA-256 over the manifest, hex, `0x`-prefixed. */
  value: string;
  signings: Signing[];
}

/**
 * The operative content of a document, in the order it is hashed.
 *
 * Deliberately not the whole `Fatwa`. Two things are excluded and the reason
 * is the same for both: they change without the decision changing.
 *
 *   - `generatedAt`. Reprinting a ruling next year must produce the same
 *     hash, or the hash means nothing.
 *   - Anything presentational — headings, wording of labels, the language the
 *     page is rendered in. A translation of the same decision is the same
 *     decision.
 */
export interface DocumentContent {
  /** The matter this decides. */
  matterId: string;
  boardId: string;
  /** ruling, refusal, lapsed, and so on. */
  kind: string;
  title: string;
  proposal: string;
  mechanism: string;
  /** What is expressly not decided. Order is the drafter's and is kept. */
  notDecided: readonly string[];
  /** Operative terms, as key/value. Order is not significant; they are sorted. */
  parameters: readonly { key: string; value: string }[];
  /** The parameter hash from `hash.ts`. Carried in, not recomputed here. */
  parameterHash: string;
  quorumRequired: number;
  /** Positions that counted, as scholarId and position. Sorted by scholarId. */
  positions: readonly { scholarId: string; position: string }[];
  /** Null where not in force. */
  inForceAt: string | null;
}

function check(label: string, s: unknown): string {
  if (typeof s !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  if (CONTROL_CHARS.test(s)) {
    throw new Error(`illegal control character in ${label}`);
  }
  return s.normalize('NFC');
}

/**
 * The canonical bytes of a document.
 *
 * Every field is tagged with its own name before its value, so a value can
 * never be mistaken for the next field — the failure that version 1 of the
 * parameter hash had, where a value containing the separators canonicalised
 * to the same bytes as two clean fields.
 */
function canonical(c: DocumentContent): string {
  const parts: string[] = [HASH_DOMAIN];

  const field = (name: string, value: string) => {
    parts.push(`${name}${FIELD_SEP}${check(name, value)}`);
  };

  field('matterId', c.matterId);
  field('boardId', c.boardId);
  field('kind', c.kind);
  field('title', c.title);
  field('proposal', c.proposal);
  field('mechanism', c.mechanism);
  field('parameterHash', c.parameterHash);
  field('quorumRequired', String(c.quorumRequired));
  field('inForceAt', c.inForceAt ?? '');

  // Order is the drafter's and carries meaning, so it is not sorted.
  c.notDecided.forEach((n, i) => field(`notDecided.${i}`, n));

  // Order is not the drafter's, so it is sorted. Duplicate keys are refused
  // rather than resolved, for the same reason as in hash.ts: there is no
  // correct answer to which of two values the board meant.
  const seen = new Set<string>();
  const params = [...c.parameters].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (const p of params) {
    const k = check('parameter key', p.key);
    if (seen.has(k)) throw new Error(`duplicate parameter key: ${JSON.stringify(k)}`);
    seen.add(k);
    parts.push(`parameter${FIELD_SEP}${k}${FIELD_SEP}${check('parameter value', p.value)}`);
  }

  const positions = [...c.positions].sort((a, b) =>
    a.scholarId < b.scholarId ? -1 : a.scholarId > b.scholarId ? 1 : 0,
  );
  for (const p of positions) {
    parts.push(
      `position${FIELD_SEP}${check('scholarId', p.scholarId)}${FIELD_SEP}${check('position', p.position)}`,
    );
  }

  return parts.join(RECORD_SEP);
}

/** SHA-256 of a document's operative content. Hex, `0x`-prefixed. */
export function documentHash(c: DocumentContent): string {
  return '0x' + createHash('sha256').update(canonical(c), 'utf8').digest('hex');
}

/**
 * The sealing key, or null.
 *
 * Read at call time rather than at import, so a test can set it and so a
 * deployment that adds the key does not need a restart to be believed.
 */
function sealingKey(): string | null {
  const k = process.env.MAJLIS_SEAL_KEY;
  return k && k.length >= 32 ? k : null;
}

/** True where this installation can seal. The interface asks before offering. */
export function canSeal(): boolean {
  return sealingKey() !== null;
}

/** Who this installation says it is, on the page. */
export function issuer(): string {
  return process.env.MAJLIS_SEAL_ISSUER || 'this Majlis installation';
}

function manifest(hash: string, at: string, iss: string, signings: readonly Signing[]): string {
  const parts = [SEAL_DOMAIN, `v${SEAL_VERSION}`, hash, check('sealed at', at), check('issuer', iss)];
  // Signatures are sealed in the order they were given, because that order is
  // a fact about what happened.
  for (const s of signings) {
    parts.push(
      [
        check('scholarId', s.scholarId),
        check('signed at', s.at),
        check('proof', s.provedBy),
        check('signed hash', s.documentHash),
        check('note', s.note ?? ''),
      ].join(FIELD_SEP),
    );
  }
  return parts.join(RECORD_SEP);
}

/**
 * Seal a document, or return null where this installation holds no key.
 *
 * Null is a real answer and the caller must render it as one. There is no
 * fallback key and no unsigned seal object.
 */
export function seal(
  content: DocumentContent,
  signings: readonly Signing[],
  at: string,
): Seal | null {
  const key = sealingKey();
  if (key === null) return null;

  const hash = documentHash(content);
  const iss = issuer();
  const value =
    '0x' + createHmac('sha256', key).update(manifest(hash, at, iss, signings), 'utf8').digest('hex');

  return { version: SEAL_VERSION, documentHash: hash, issuer: iss, at, value, signings: [...signings] };
}

export type SealCheck =
  /** The document is the one that was sealed, and the seal is this installation's. */
  | { held: true }
  /** No key configured here. Nothing can be checked, and that is not a failure. */
  | { held: false; because: 'no_key_here' }
  /** The document has changed since it was sealed. */
  | { held: false; because: 'document_changed'; expected: string; found: string }
  /** The content matches but the seal value does not. Wrong key, or forged. */
  | { held: false; because: 'seal_does_not_match' }
  /** Sealed under an older version of these rules. */
  | { held: false; because: 'older_version'; version: number };

/**
 * Check a seal against the document it claims to cover.
 *
 * The three failures are kept apart on purpose. "The document changed" and
 * "the seal is wrong" are different accusations, and a reader handed one word
 * for both learns nothing about which happened.
 */
export function verify(content: DocumentContent, s: Seal): SealCheck {
  if (s.version !== SEAL_VERSION) {
    return { held: false, because: 'older_version', version: s.version };
  }

  const hash = documentHash(content);
  if (hash !== s.documentHash) {
    return { held: false, because: 'document_changed', expected: s.documentHash, found: hash };
  }

  const key = sealingKey();
  if (key === null) return { held: false, because: 'no_key_here' };

  const expected =
    '0x' +
    createHmac('sha256', key)
      .update(manifest(s.documentHash, s.at, s.issuer, s.signings), 'utf8')
      .digest('hex');

  // Constant time. A comparison that returns early leaks how much of a forged
  // seal was right, one byte at a time.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(s.value, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { held: false, because: 'seal_does_not_match' };
  }

  return { held: true };
}

/**
 * A signature given against a different draft from the one being read.
 *
 * Not an error and not hidden. A member who signed on Tuesday and had the
 * document amended on Wednesday has signed something else, and the page must
 * say which of the names under it are in that position.
 */
export function signedSomethingElse(s: Signing, hash: string): boolean {
  return s.documentHash !== hash;
}

/**
 * The eight groups of characters a person reads aloud to check a hash.
 *
 * A 64-character hex string is unreadable and unverifiable by a human, and an
 * auditor comparing two of them by eye will miss a changed character. Grouped
 * in fours, a person can actually do it.
 */
export function readable(hash: string): string {
  const hex = hash.startsWith('0x') ? hash.slice(2) : hash;
  return (hex.slice(0, 32).match(/.{1,4}/g) ?? []).join(' ');
}
