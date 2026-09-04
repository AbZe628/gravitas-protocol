import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  ACCEPTED,
  DiskVault,
  MAX_BYTES,
  NoVault,
  UnacceptableFile,
  checkAcceptable,
  vaultFromEnv,
} from '../src/store/vault.js';

/**
 * Where a scholar's document goes.
 *
 * The rule this file holds: where there is nowhere durable to put a file, it
 * refuses to take one. A file accepted into storage that does not survive a
 * restart is worse than a file refused — the board would cite it, and the
 * citation would point at nothing.
 */

let dir: string;
let vault: DiskVault;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'majlis-vault-'));
  vault = new DiskVault(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const pdf = () => Buffer.from('%PDF-1.7 a term sheet');

describe('what it accepts', () => {
  it('takes the kinds a board actually attaches', () => {
    for (const mediaType of Object.keys(ACCEPTED)) {
      expect(() => checkAcceptable(pdf(), mediaType)).not.toThrow();
    }
  });

  it('refuses anything else, and says why in terms of what would go wrong', () => {
    try {
      checkAcceptable(pdf(), 'application/x-msdownload');
      expect.unreachable();
    } catch (e) {
      expect((e as UnacceptableFile).code).toBe('wrong_type');
      expect((e as UnacceptableFile).message).toContain('a way into a record');
    }
  });

  it('refuses an empty file', () => {
    try {
      checkAcceptable(Buffer.alloc(0), 'application/pdf');
      expect.unreachable();
    } catch (e) {
      expect((e as UnacceptableFile).code).toBe('empty');
    }
  });

  it('refuses one over the limit, and says the limit rather than only refusing', () => {
    const huge = Buffer.alloc(MAX_BYTES + 1);
    try {
      checkAcceptable(huge, 'application/pdf');
      expect.unreachable();
    } catch (e) {
      expect((e as UnacceptableFile).code).toBe('too_large');
      expect((e as UnacceptableFile).message).toContain('20 MB');
    }
  });
});

describe('the key is the proof', () => {
  it('is the SHA-256 of the bytes', async () => {
    const bytes = pdf();
    const stored = await vault.put({ bytes, mediaType: 'application/pdf' });

    expect(stored.key).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(stored.bytes).toBe(bytes.length);
  });

  it('gives the same document the same key however often it is attached', async () => {
    const first = await vault.put({ bytes: pdf(), mediaType: 'application/pdf' });
    const second = await vault.put({ bytes: pdf(), mediaType: 'application/pdf' });

    expect(second.key).toBe(first.key);
    // And it is one file on the volume, not two.
    const files = readdirSync(join(dir, first.key.slice(0, 2), first.key.slice(2, 4)));
    expect(files).toEqual([first.key]);
  });

  it('gives different documents different keys', async () => {
    const a = await vault.put({ bytes: Buffer.from('one'), mediaType: 'text/plain' });
    const b = await vault.put({ bytes: Buffer.from('two'), mediaType: 'text/plain' });
    expect(a.key).not.toBe(b.key);
  });
});

describe('reading one back', () => {
  it('returns exactly what was put in', async () => {
    const bytes = pdf();
    const { key } = await vault.put({ bytes, mediaType: 'application/pdf' });

    expect(await vault.get(key)).toEqual(bytes);
    expect((await vault.stat(key))?.bytes).toBe(bytes.length);
  });

  it('says nothing rather than something for a key it does not hold', async () => {
    expect(await vault.get('a'.repeat(64))).toBeNull();
    expect(await vault.stat('a'.repeat(64))).toBeNull();
  });

  it('refuses a key that is not a key, before it reaches a path', async () => {
    // A key comes from the record rather than from a request today, and relying
    // on that would be relying on a fact that holds only until somebody adds a
    // route.
    for (const bad of ['../../etc/passwd', 'abc', '', 'A'.repeat(64), '../' + 'a'.repeat(61)]) {
      expect(await vault.get(bad)).toBeNull();
      expect(await vault.stat(bad)).toBeNull();
    }
  });
});

describe('the volume it writes to', () => {
  it('spreads files across directories rather than into one', async () => {
    const { key } = await vault.put({ bytes: pdf(), mediaType: 'application/pdf' });
    expect(existsSync(join(dir, key.slice(0, 2), key.slice(2, 4), key))).toBe(true);
  });

  it('leaves no temporary file behind', async () => {
    const { key } = await vault.put({ bytes: pdf(), mediaType: 'application/pdf' });
    const files = readdirSync(join(dir, key.slice(0, 2), key.slice(2, 4)));
    expect(files.some((f) => f.endsWith('.tmp'))).toBe(false);
  });

  it('creates the directory it was given', () => {
    const fresh = join(dir, 'nested', 'deeper');
    new DiskVault(fresh);
    expect(existsSync(fresh)).toBe(true);
  });
});

describe('no volume, so no files', () => {
  const none = new NoVault();

  it('refuses to take one rather than accepting into somewhere that vanishes', async () => {
    await expect(none.put()).rejects.toBeInstanceOf(UnacceptableFile);
  });

  it('says what to do about it, because the cause is configuration', async () => {
    try {
      await none.put();
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toContain('MAJLIS_FILES');
      expect((e as Error).message).toContain('the citation would point at nothing');
    }
  });

  it('says what it is, so an interface can stop offering an upload', () => {
    expect(none.kind).toBe('none');
    expect(new DiskVault(dir).kind).toBe('disk');
  });

  it('finds nothing rather than throwing', async () => {
    expect(await none.get()).toBeNull();
    expect(await none.stat()).toBeNull();
  });
});

describe('chosen from the environment', () => {
  const saved = { files: process.env.MAJLIS_FILES, db: process.env.MAJLIS_DB };

  afterEach(() => {
    process.env.MAJLIS_FILES = saved.files;
    process.env.MAJLIS_DB = saved.db;
    if (saved.files === undefined) delete process.env.MAJLIS_FILES;
    if (saved.db === undefined) delete process.env.MAJLIS_DB;
  });

  it('takes the directory it is given', () => {
    process.env.MAJLIS_FILES = join(dir, 'chosen');
    expect(vaultFromEnv().kind).toBe('disk');
    expect(existsSync(join(dir, 'chosen'))).toBe(true);
  });

  it('goes beside the record where only the record is configured', () => {
    // The same volume: the one place already known to survive.
    delete process.env.MAJLIS_FILES;
    process.env.MAJLIS_DB = join(dir, 'record', 'majlis.json');

    expect(vaultFromEnv().kind).toBe('disk');
    expect(existsSync(join(dir, 'record', 'files'))).toBe(true);
  });

  it('has no vault where neither is set, which is honest for a development run', () => {
    delete process.env.MAJLIS_FILES;
    delete process.env.MAJLIS_DB;
    expect(vaultFromEnv().kind).toBe('none');
  });
});
