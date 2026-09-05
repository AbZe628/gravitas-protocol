import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { DiskVault } from '../src/store/vault.js';
import { AnthropicReading, ReadingOff, type Reading } from '../src/services/reading.js';
import type { ExtractOptions, Extraction } from '../src/services/extraction.js';
import { extract } from '../src/services/extraction.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * Reading a document, over HTTP.
 *
 * The line these hold: it is **off unless turned on**, and off is a setting
 * rather than a fault — the figures can be typed in, which is what they always
 * were. And nothing it returns is confirmed: a candidate is not a figure until
 * a member says it is.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
const MEMBERS = ['member-a:signatory', 'watcher:observer']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');
const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

const STATEMENT =
  'Interim accounts, H1 2026.\nTotal revenue 100,000,000 AED.\n' +
  'Total non-permissible income 3,200,000 AED.\n';

/** A reading that hands the real screening a canned model reply. */
class StubReading implements Reading {
  readonly kind = 'anthropic' as const;
  readonly available = true;
  constructor(private readonly reply: string) {}
  read(input: ExtractOptions): Promise<Extraction> {
    return extract({
      ...input,
      client: {
        messages: { create: async () => ({ content: [{ type: 'text', text: this.reply }] }) },
      } as never,
    });
  }
}

const CANDIDATES = JSON.stringify({
  candidates: [
    {
      field: 'nonPermissibleIncome',
      value: '3,200,000',
      quote: 'Total non-permissible income 3,200,000 AED.',
      page: 1,
      notFound: false,
    },
    { field: 'marketCapitalisation', notFound: true },
  ],
});

let app: Express;
let dir: string;
const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  pass: process.env.BASIC_AUTH_PASSWORD,
};

function boot(reading: Reading) {
  app = createApp(new MemoryStore(), undefined, undefined, new DiskVault(dir), reading);
}

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASSWORD;
  dir = mkdtempSync(join(tmpdir(), 'majlis-reading-'));
  boot(new StubReading(CANDIDATES));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

/** A matter with the bank's statement attached to it. */
async function withDocument(): Promise<{ matterId: string; sourceId: string }> {
  const opened = await request(app)
    .post('/api/matters')
    .set('Authorization', as('member-a'))
    .send({
      boardId: 'demo-board',
      title: 'Screening the issuer',
      proposal: 'The board is asked to screen the issuer against the three ratios.',
      direction: 'permit',
      origin: 'institution_request',
    })
    .expect(201);

  const matterId = opened.body.id as string;
  await request(app).post(`/api/matters/${matterId}/open`).set('Authorization', as('member-a')).expect(200);

  const attached = await request(app)
    .post(`/api/matters/${matterId}/sources/file?label=Interim accounts&name=accounts.txt`)
    .set('Authorization', as('member-a'))
    .set('Content-Type', 'text/plain')
    .send(STATEMENT)
    .expect(201);

  const source = attached.body.sources.find((s: { kind: string }) => s.kind === 'document');
  return { matterId, sourceId: source.id as string };
}

const read = (
  ids: { matterId: string; sourceId: string },
  fields = ['nonPermissibleIncome', 'marketCapitalisation'],
  who = 'member-a',
) =>
  request(app)
    .post(`/api/matters/${ids.matterId}/sources/${ids.sourceId}/extract`)
    .set('Authorization', as(who))
    .send({ fields });

describe('off unless turned on', () => {
  it('says so as a setting rather than as a fault', async () => {
    boot(new ReadingOff());
    const ids = await withDocument();
    const res = await read(ids).expect(501);

    expect(res.body.error).toBe('reading_off');
    expect(res.body.message).toContain('a setting rather than a fault');
    // And says the path that always existed is unchanged.
    expect(res.body.message).toContain('typed in');
  });

  it('says which it is on health, so an interface can stop offering it', async () => {
    boot(new ReadingOff());
    expect((await request(app).get('/api/health').expect(200)).body.reading).toBe('off');

    boot(new AnthropicReading());
    expect((await request(app).get('/api/health').expect(200)).body.reading).toBe('anthropic');
  });

  it('is not inferred from a key being present', async () => {
    // The assistant infers from an existing key so an upgrade does not remove
    // something in use. Nothing here has ever been on, and a bank's accounts
    // are not something to start sending by default.
    const savedKey = process.env.ANTHROPIC_API_KEY;
    const savedReading = process.env.MAJLIS_READING;
    process.env.ANTHROPIC_API_KEY = 'sk-not-a-real-key';
    delete process.env.MAJLIS_READING;

    const { readingFromEnv } = await import('../src/services/reading.js');
    expect(readingFromEnv().kind).toBe('off');

    process.env.ANTHROPIC_API_KEY = savedKey;
    process.env.MAJLIS_READING = savedReading;
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    if (savedReading === undefined) delete process.env.MAJLIS_READING;
  });
});

describe('what comes back', () => {
  it('proposes candidates with the sentence each came from', async () => {
    const ids = await withDocument();
    const res = await read(ids).expect(200);

    const income = res.body.candidates.find(
      (c: { field: string }) => c.field === 'nonPermissibleIncome',
    );
    expect(income.value).toBe('3,200,000');
    expect(income.quote).toBe('Total non-permissible income 3,200,000 AED.');
    // The text was here to check against, so the quote was matched.
    expect(income.quoteVerified).toBe(true);
  });

  it('confirms nothing, because a candidate is not a figure until a member says so', async () => {
    const ids = await withDocument();
    const res = await read(ids).expect(200);

    for (const candidate of res.body.candidates) {
      expect(candidate.confirmedBy).toBeNull();
      expect(candidate.confirmedAt).toBeNull();
    }
    expect(res.body.note).toContain('until a member confirms it');
  });

  it('carries a field it could not find as absent rather than as a zero', async () => {
    const ids = await withDocument();
    const res = await read(ids).expect(200);

    const absent = res.body.candidates.find(
      (c: { field: string }) => c.field === 'marketCapitalisation',
    );
    expect(absent.notFound).toBe(true);
    expect(absent.value).toBeNull();
  });

  it('refuses where the model reached for a verdict of its own', async () => {
    boot(new StubReading('On reading the accounts this is permissible.\n' + CANDIDATES));
    const ids = await withDocument();
    const res = await read(ids).expect(502);

    expect(res.body.error).toBe('breached_constraint');
    expect(res.body.message).toContain('no figure on any balance sheet answers it');
  });
});

describe('what it will not read', () => {
  it('refuses a source that is not a document', async () => {
    const ids = await withDocument();
    const cited = await request(app)
      .post(`/api/matters/${ids.matterId}/sources`)
      .set('Authorization', as('member-a'))
      .send({ kind: 'standard', label: 'AAOIFI SS 21', ref: 'SS-21' })
      .expect(201);

    const plain = cited.body.sources[cited.body.sources.length - 1];
    await read({ matterId: ids.matterId, sourceId: plain.id }).expect(404);
  });

  it('refuses a matter this store cannot see', async () => {
    await read({ matterId: 'not-this-institutions', sourceId: 's1' }).expect(404);
  });

  it('refuses without fields, because the model does not choose what to look for', async () => {
    const ids = await withDocument();
    await read(ids, []).expect(400);
  });

  it('does not let an observer send a document to a model', async () => {
    const ids = await withDocument();
    await read(ids, ['nonPermissibleIncome'], 'watcher').expect(403);
  });

  it('refuses anonymously, like every other route', async () => {
    const ids = await withDocument();
    await request(app)
      .post(`/api/matters/${ids.matterId}/sources/${ids.sourceId}/extract`)
      .send({ fields: ['x'] })
      .expect(401);
  });
});

describe('the documents a board has been given', () => {
  it('lists them across matters, so a form does not have to hunt for one', async () => {
    const ids = await withDocument();
    const res = await request(app).get('/api/documents').set('Authorization', as('watcher')).expect(200);

    expect(res.body.documents).toHaveLength(1);
    expect(res.body.documents[0]).toMatchObject({
      matterId: ids.matterId,
      sourceId: ids.sourceId,
      name: 'accounts.txt',
      label: 'Interim accounts',
      withdrawn: false,
    });
  });

  it('keeps a withdrawn one and says so, rather than losing the document', async () => {
    const ids = await withDocument();
    await request(app)
      .delete(`/api/matters/${ids.matterId}/sources/${ids.sourceId}`)
      .set('Authorization', as('member-a'))
      .expect(200);

    const res = await request(app).get('/api/documents').set('Authorization', as('member-a')).expect(200);
    expect(res.body.documents[0].withdrawn).toBe(true);
  });

  it('lists nothing where no document has been attached', async () => {
    const res = await request(app).get('/api/documents').set('Authorization', as('watcher')).expect(200);
    expect(res.body.documents).toEqual([]);
  });

  it('leaves out an ordinary citation, which is not a document', async () => {
    const ids = await withDocument();
    await request(app)
      .post(`/api/matters/${ids.matterId}/sources`)
      .set('Authorization', as('member-a'))
      .send({ kind: 'standard', label: 'AAOIFI SS 21', ref: 'SS-21' })
      .expect(201);

    const res = await request(app).get('/api/documents').set('Authorization', as('member-a')).expect(200);
    expect(res.body.documents).toHaveLength(1);
  });
});
