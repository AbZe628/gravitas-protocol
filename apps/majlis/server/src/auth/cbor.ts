/**
 * Just enough CBOR to read a passkey.
 *
 * ── why this is written here rather than installed ────────────────────────
 *
 * Two structures in WebAuthn are CBOR and nothing else in this application
 * is: the `attestationObject` a browser returns when a device is enrolled,
 * and the COSE public key inside it. Both are small maps of integers, byte
 * strings and text strings.
 *
 * A dependency for that would be a dependency a bank's security review has to
 * read, kept current for years, for the sake of a reader of about a hundred
 * lines. What is implemented is the subset those two structures use: unsigned
 * and negative integers, byte strings, text strings, arrays and maps of
 * definite length. Everything else — tags, floats, indefinite length,
 * simple values — is refused by name rather than skipped, because a passkey
 * that decodes to something unexpected must fail loudly.
 *
 * This is a reader only. Nothing here writes CBOR, because nothing in this
 * application has a reason to.
 */

/** A decoded CBOR value. Maps keep integer keys, which COSE relies on. */
export type CborValue =
  | number
  | bigint
  | string
  | Uint8Array
  | CborValue[]
  | Map<number | string, CborValue>;

export class MalformedCbor extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedCbor';
  }
}

interface Reader {
  readonly bytes: Uint8Array;
  at: number;
}

function need(r: Reader, count: number): void {
  if (r.at + count > r.bytes.length) {
    throw new MalformedCbor('The encoding ends in the middle of a value.');
  }
}

/** The argument that follows a major type, which is where the length lives. */
function argument(r: Reader, minor: number): number {
  if (minor < 24) return minor;

  if (minor === 24) {
    need(r, 1);
    return r.bytes[r.at++];
  }
  if (minor === 25) {
    need(r, 2);
    const v = (r.bytes[r.at] << 8) | r.bytes[r.at + 1];
    r.at += 2;
    return v;
  }
  if (minor === 26) {
    need(r, 4);
    const view = new DataView(r.bytes.buffer, r.bytes.byteOffset + r.at, 4);
    r.at += 4;
    return view.getUint32(0);
  }
  /*
   * 27 is a 64-bit length and 28..30 are reserved. Neither appears in a
   * passkey, and a value that needs more than four bytes of length is not
   * something this reader should be quietly accepting.
   */
  throw new MalformedCbor(`A length of this size is not read here (minor ${minor}).`);
}

function value(r: Reader): CborValue {
  need(r, 1);
  const initial = r.bytes[r.at++];
  const major = initial >> 5;
  const minor = initial & 0x1f;

  switch (major) {
    case 0:
      return argument(r, minor);
    case 1:
      return -1 - argument(r, minor);
    case 2: {
      const length = argument(r, minor);
      need(r, length);
      const out = r.bytes.subarray(r.at, r.at + length);
      r.at += length;
      return out;
    }
    case 3: {
      const length = argument(r, minor);
      need(r, length);
      const out = new TextDecoder('utf-8', { fatal: true }).decode(
        r.bytes.subarray(r.at, r.at + length),
      );
      r.at += length;
      return out;
    }
    case 4: {
      const length = argument(r, minor);
      const out: CborValue[] = [];
      for (let i = 0; i < length; i += 1) out.push(value(r));
      return out;
    }
    case 5: {
      const length = argument(r, minor);
      const out = new Map<number | string, CborValue>();
      for (let i = 0; i < length; i += 1) {
        const key = value(r);
        if (typeof key !== 'number' && typeof key !== 'string') {
          throw new MalformedCbor('A map key here is always an integer or a string.');
        }
        /*
         * A repeated key is malformed, and taking the last one silently is how
         * one reader disagrees with another about what a structure says.
         */
        if (out.has(key)) throw new MalformedCbor(`The key ${key} appears twice in one map.`);
        out.set(key, value(r));
      }
      return out;
    }
    default:
      throw new MalformedCbor(
        `Major type ${major} is not read here. A passkey does not contain one.`,
      );
  }
}

/**
 * Decode one CBOR value, which must be the whole of the input.
 *
 * Trailing bytes are refused rather than ignored: they mean the encoding is
 * not what it claims to be, and the one thing worse than failing to read a
 * credential is reading part of one.
 */
export function decode(bytes: Uint8Array): CborValue {
  const r: Reader = { bytes, at: 0 };
  const out = value(r);
  if (r.at !== bytes.length) {
    throw new MalformedCbor(`${bytes.length - r.at} bytes follow the value and belong to nothing.`);
  }
  return out;
}
