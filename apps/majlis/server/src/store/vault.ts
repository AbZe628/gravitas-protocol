/**
 * Where a scholar's document actually goes.
 *
 * `SourceRef.file` has been on the type since the register was built and
 * nothing wrote to it, with a comment saying why: storage was not durable, and
 * a feature that silently loses a scholar's document is worse than one that
 * does not exist. This is that feature, and it keeps the same rule — where
 * there is nowhere durable to put a file, it refuses to take one.
 *
 * ── the four decisions ────────────────────────────────────────────────────
 *
 * **An interface with implementations behind it**, like the record's store. On
 * disk today, beside the record and on the same volume, which costs nothing and
 * needs no account. Object storage later is another implementation of these
 * three methods rather than a different application.
 *
 * **Content-addressed.** The key is the SHA-256 of the bytes. The same document
 * attached twice is one file, a key proves what it holds, and nobody has to
 * invent a naming scheme that will later collide.
 *
 * **Nothing is ever deleted.** A source is withdrawn rather than removed,
 * because a board that cited something and thought better of it is part of how
 * it reasoned. The file it cited has to survive for the same reason: a
 * withdrawn citation pointing at nothing is worse than no citation.
 *
 * **A file is not addressable on its own.** There is no route that takes a key.
 * A file is reached through the source that references it, on the matter that
 * carries that source, and the tenant store already scopes matters — so one
 * institution cannot read another's document by structure rather than by the
 * key being hard to guess.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface StoredFile {
  /** SHA-256 of the bytes, in hex. The key and the proof at once. */
  key: string;
  bytes: number;
  mediaType: string;
}

export interface Vault {
  /**
   * What this installation has.
   *
   * `none` is an ordinary state rather than a broken one — a development run
   * with no volume — and the interface must be able to say so, because an
   * upload control offered where nothing can be stored is a control that lies.
   */
  readonly kind: 'disk' | 'none';

  put(input: { bytes: Buffer; mediaType: string }): Promise<StoredFile>;
  get(key: string): Promise<Buffer | null>;
  stat(key: string): Promise<StoredFile | null>;
}

/**
 * What a board actually attaches.
 *
 * A term sheet, a prospectus, an auditor's letter, a photograph of a signed
 * page. Everything else is refused, and not out of tidiness: a store that
 * accepts anything serves anything back, and arbitrary bytes served from a
 * governance record is how a document becomes a way into it.
 */
export const ACCEPTED: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

/**
 * Twenty megabytes.
 *
 * Large enough for a scanned prospectus, small enough that a board cannot fill
 * a volume by accident. It is a constant rather than a setting because a limit
 * nobody can see is a limit somebody discovers at the worst moment.
 */
export const MAX_BYTES = 20 * 1024 * 1024;

export class UnacceptableFile extends Error {
  constructor(readonly code: 'too_large' | 'wrong_type' | 'empty', message: string) {
    super(message);
    this.name = 'UnacceptableFile';
  }
}

export function checkAcceptable(bytes: Buffer, mediaType: string): void {
  if (bytes.length === 0) {
    throw new UnacceptableFile('empty', 'That file is empty.');
  }
  if (bytes.length > MAX_BYTES) {
    throw new UnacceptableFile(
      'too_large',
      `That file is ${(bytes.length / 1024 / 1024).toFixed(1)} MB, and the limit is ` +
        `${MAX_BYTES / 1024 / 1024} MB. A board cannot fill a volume by accident, which is the ` +
        'point of the limit rather than a judgement about the document.',
    );
  }
  if (!ACCEPTED[mediaType]) {
    throw new UnacceptableFile(
      'wrong_type',
      `"${mediaType}" is not a kind of file this record takes. It accepts ` +
        `${Object.keys(ACCEPTED).join(', ')} — a store that accepted anything would serve ` +
        'anything back, and that is how a document becomes a way into a record.',
    );
  }
}

/**
 * Files on the same volume as the record.
 *
 * Written the same way the record is: to a temporary name, then renamed over
 * the real one. Rename is atomic, so a reader — or the next process after a
 * crash — sees a whole file or no file, never half of one.
 */
export class DiskVault implements Vault {
  readonly kind = 'disk' as const;
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
    mkdirSync(this.dir, { recursive: true });
  }

  /**
   * Two levels of directory from the key.
   *
   * A single directory with tens of thousands of entries is slow to list on
   * every filesystem that has ever shipped, and a board attaching a document a
   * week takes a long time to get there — which is exactly why it is worth
   * doing now rather than after somebody notices.
   */
  private pathFor(key: string): string {
    return join(this.dir, key.slice(0, 2), key.slice(2, 4), key);
  }

  async put(input: { bytes: Buffer; mediaType: string }): Promise<StoredFile> {
    checkAcceptable(input.bytes, input.mediaType);

    const key = createHash('sha256').update(input.bytes).digest('hex');
    const target = this.pathFor(key);

    // Content-addressed, so a file that is already there is the same file.
    // Writing it again would be identical work for an identical result.
    if (!existsSync(target)) {
      mkdirSync(dirname(target), { recursive: true });
      const temporary = target + '.' + process.pid + '.tmp';
      writeFileSync(temporary, input.bytes);
      renameSync(temporary, target);
    }

    // The media type is not stored beside the file: it belongs to the source
    // that cites it, which is where a reader looks for what a document is.
    return { key, bytes: input.bytes.length, mediaType: input.mediaType };
  }

  async get(key: string): Promise<Buffer | null> {
    if (!isKey(key)) return null;
    const target = this.pathFor(key);
    return existsSync(target) ? readFileSync(target) : null;
  }

  async stat(key: string): Promise<StoredFile | null> {
    if (!isKey(key)) return null;
    const target = this.pathFor(key);
    if (!existsSync(target)) return null;
    // The media type is the citing source's to say; this reports what the
    // volume knows, which is a size.
    return { key, bytes: statSync(target).size, mediaType: '' };
  }
}

/**
 * A key, or something that is not one.
 *
 * Checked before the key touches a path. A key comes from the record rather
 * than from a request today, and relying on that would be relying on a fact
 * that stays true only until somebody adds a route.
 */
function isKey(key: string): boolean {
  return /^[0-9a-f]{64}$/.test(key);
}

/**
 * No volume, so no files.
 *
 * It refuses rather than accepting into a directory that will not survive the
 * next deploy. The refusal says what to do about it, because the cause is
 * always configuration and never the request.
 */
export class NoVault implements Vault {
  readonly kind = 'none' as const;

  async put(): Promise<StoredFile> {
    throw new UnacceptableFile(
      'wrong_type',
      'This installation has nowhere durable to keep a document, so it will not take one. A file ' +
        'accepted into storage that does not survive a restart is worse than a file refused: the ' +
        'board would cite it, and the citation would point at nothing. Set MAJLIS_FILES to a path ' +
        'on a mounted volume.',
    );
  }

  async get(): Promise<Buffer | null> {
    return null;
  }

  async stat(): Promise<StoredFile | null> {
    return null;
  }
}

/**
 * Chosen from the environment, and beside the record by default.
 *
 * `MAJLIS_FILES` names the directory. Unset but with a record path configured,
 * files go beside the record — the same volume, which is the one place already
 * known to survive. Neither set, and there is no vault, which is the honest
 * answer for a development run.
 */
export function vaultFromEnv(): Vault {
  const configured = process.env.MAJLIS_FILES?.trim();
  if (configured) return new DiskVault(configured);

  const record = process.env.MAJLIS_DB?.trim();
  if (record) return new DiskVault(join(dirname(record), 'files'));

  return new NoVault();
}
