import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storeFromEnv, FileStore, MemoryStore } from '../src/store/index.js';

const saved = { db: process.env.MAJLIS_DB, env: process.env.NODE_ENV };
const dirs: string[] = [];

afterEach(() => {
  process.env.MAJLIS_DB = saved.db;
  process.env.NODE_ENV = saved.env;
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'majlis-sel-'));
  dirs.push(dir);
  return join(dir, 'record.json');
}

describe('choosing where the record lives', () => {
  it('MAJLIS_DB gets the durable store, and the file appears', async () => {
    const file = tempFile();
    process.env.MAJLIS_DB = file;

    const store = storeFromEnv();
    expect(store).toBeInstanceOf(FileStore);
    expect(existsSync(file)).toBe(true);
    await store.close();
  });

  it('without it, development runs in memory', async () => {
    delete process.env.MAJLIS_DB;
    process.env.NODE_ENV = 'development';

    const store = storeFromEnv();
    expect(store).toBeInstanceOf(MemoryStore);
    await store.close();
  });

  it('production refuses to start rather than silently forgetting', () => {
    delete process.env.MAJLIS_DB;
    process.env.NODE_ENV = 'production';

    // A governance system that loses decisions on restart is worse than one
    // that will not boot: the first is discovered by a board looking for a
    // decision that is no longer there.
    expect(() => storeFromEnv()).toThrow(/MAJLIS_DB is not set/);
    expect(() => storeFromEnv()).toThrow(/survives a restart/);
  });

  it('an empty MAJLIS_DB is treated as unset, not as a filename', () => {
    process.env.MAJLIS_DB = '   ';
    process.env.NODE_ENV = 'production';
    expect(() => storeFromEnv()).toThrow(/MAJLIS_DB is not set/);
  });
});
