import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { DiskVault, NoVault } from '../src/store/vault.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * Attaching a document over HTTP.
 *
 * The two things these hold to. A document is reached **through the source
 * that cites it**, never by key — so one institution cannot read another's by
 * structure rather than by the key being hard to guess. And where there is
 * nowhere durable to keep one, the route refuses rather than accepting into
 * somewhere that vanishes.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = ['member-a:signatory', 'advisor-1:advisory', 'watcher:observer']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

const PDF = Buffer.from('%PDF-1.7 the issuer term sheet');
const KEY = createHash('sha256').update(PDF).digest('hex');

let app: Express;
let dir: string;
const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  pass: process.env.BASIC_AUTH_PASSWORD,
};

function boot(withVault = true) {
  app = createApp(
    new MemoryStore(),
    undefined,
    undefined,
    withVault ? new DiskVault(dir) : new NoVault(),
  );
}

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASSWORD;
  dir = mkdtempSync(join(tmpdir(), 'majlis-vault-http-'));
  boot();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

async function openMatter(who = 'member-a'): Promise<string> {
  const res = await request(app)
    .post('/api/matters')
    .set('Authorization', as(who))
    .send({
      boardId: 'demo-board',
      title: 'Whether the wrapper inherits the underlying ruling',
      proposal: 'The board is asked whether the wrapper is a separate asset.',
      direction: 'permit',
      origin: 'institution_request',
    })
    .expect(201);

  const id = res.body.id as string;
  await request(app).post(`/api/matters/${id}/open`).set('Authorization', as(who)).expect(200);
  return id;
}

const upload = (id: string, query = 'label=Issuer term sheet&name=terms.pdf', who = 'member-a') =>
  request(app)
    .post(`/api/matters/${id}/sources/file?${query}`)
    .set('Authorization', as(who))
    .set('Content-Type', 'application/pdf')
    .send(PDF);

describe('attaching a document', () => {
  it('becomes an ordinary source carrying the file', async () => {
    const id = await openMatter();
    const res = await upload(id).expect(201);

    const source = res.body.sources.find((s: { kind: string }) => s.kind === 'document');
    expect(source.label).toBe('Issuer term sheet');
    expect(source.file).toMatchObject({ name: 'terms.pdf', mediaType: 'application/pdf', key: KEY });
    // The key is the reference: it is the SHA-256 of the bytes, so it is also
    // the proof of what was attached.
    expect(source.ref).toBe(KEY);
    expect(source.addedBy).toBe('member-a');
  });

  it('refuses without a label, because a record full of scan.pdf is unsearchable', async () => {
    const id = await openMatter();
    const res = await upload(id, 'name=scan.pdf').expect(400);

    expect(res.body.error).toBe('no_label');
    expect(res.body.message).toContain('nobody can search');
  });

  it('refuses a kind of file this record does not take', async () => {
    const id = await openMatter();
    // express.raw only parses the types the vault accepts, so anything else
    // arrives with no body at all — which is refused just as firmly.
    const res = await request(app)
      .post(`/api/matters/${id}/sources/file?label=Something&name=x.exe`)
      .set('Authorization', as('member-a'))
      .set('Content-Type', 'application/x-msdownload')
      .send(PDF);

    expect(res.status).toBe(400);
  });

  it('does not let an observer attach one', async () => {
    const id = await openMatter();
    await upload(id, 'label=Issuer term sheet&name=terms.pdf', 'watcher').expect(403);
  });

  it('refuses anonymously, like every other route', async () => {
    const id = await openMatter();
    await request(app)
      .post(`/api/matters/${id}/sources/file?label=x&name=y.pdf`)
      .set('Content-Type', 'application/pdf')
      .send(PDF)
      .expect(401);
  });
});

describe('reading one back', () => {
  it('serves the bytes that were put in', async () => {
    const id = await openMatter();
    const attached = await upload(id).expect(201);
    const source = attached.body.sources.find((s: { kind: string }) => s.kind === 'document');

    const res = await request(app)
      .get(`/api/matters/${id}/sources/${source.id}/file`)
      .set('Authorization', as('watcher'))
      .expect(200);

    expect(Buffer.from(res.body)).toEqual(PDF);
  });

  it('serves it as an attachment and never inline', async () => {
    const id = await openMatter();
    const attached = await upload(id).expect(201);
    const source = attached.body.sources.find((s: { kind: string }) => s.kind === 'document');

    const res = await request(app)
      .get(`/api/matters/${id}/sources/${source.id}/file`)
      .set('Authorization', as('member-a'))
      .expect(200);

    // A record that rendered a supplied document in its own origin is a record
    // that can be written into by whoever supplied it.
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('still serves a withdrawn source’s file', async () => {
    const id = await openMatter();
    const attached = await upload(id).expect(201);
    const source = attached.body.sources.find((s: { kind: string }) => s.kind === 'document');

    await request(app)
      .delete(`/api/matters/${id}/sources/${source.id}`)
      .set('Authorization', as('member-a'))
      .expect(200);

    // A board that cited something and thought better of it is part of how it
    // reasoned; a withdrawn citation pointing at nothing would be worse.
    await request(app)
      .get(`/api/matters/${id}/sources/${source.id}/file`)
      .set('Authorization', as('member-a'))
      .expect(200);
  });

  it('is reached through the source and never by key', async () => {
    const id = await openMatter();
    await upload(id).expect(201);

    // There is no route that takes a key. This is the shape somebody would try.
    await request(app).get(`/api/files/${KEY}`).set('Authorization', as('member-a')).expect(404);
  });

  it('refuses a matter this store cannot see, which is what scopes the file', async () => {
    // The whole tenant guarantee for documents rests on this line: the route
    // reaches a file only through store.matter(), and TenantStore answers null
    // for another institution's — indistinguishably from one that is not there.
    const res = await request(app)
      .get('/api/matters/not-this-institutions/sources/s-anything/file')
      .set('Authorization', as('member-a'))
      .expect(404);

    expect(res.body.message).toBe('No such matter.');
  });

  it('answers a source that is not a document as absent', async () => {
    const id = await openMatter();
    const cited = await request(app)
      .post(`/api/matters/${id}/sources`)
      .set('Authorization', as('member-a'))
      .send({ kind: 'standard', label: 'AAOIFI SS 17', ref: 'SS-17' })
      .expect(201);

    const source = cited.body.sources[cited.body.sources.length - 1];
    const res = await request(app)
      .get(`/api/matters/${id}/sources/${source.id}/file`)
      .set('Authorization', as('member-a'))
      .expect(404);

    expect(res.body.message).toContain('not a document');
  });

  it('says a cited document is missing rather than dropping the citation', async () => {
    const id = await openMatter();
    const attached = await upload(id).expect(201);
    const source = attached.body.sources.find((s: { kind: string }) => s.kind === 'document');

    // The record survives; the volume does not. That is a missing file rather
    // than a missing citation.
    rmSync(dir, { recursive: true, force: true });

    const res = await request(app)
      .get(`/api/matters/${id}/sources/${source.id}/file`)
      .set('Authorization', as('member-a'))
      .expect(404);

    expect(res.body.message).toContain('the citation stays');
  });
});

describe('an installation with nowhere to keep one', () => {
  beforeEach(() => boot(false));

  it('refuses to take a document rather than accepting into somewhere that vanishes', async () => {
    const id = await openMatter();
    const res = await upload(id).expect(503);

    expect(res.body.error).toBe('no_vault');
    expect(res.body.message).toContain('the citation would point at nothing');
  });

  it('says so on health, so an interface can stop offering the upload', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.documents).toBe('none');
  });

  it('says so the other way where there is a volume', async () => {
    boot(true);
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.documents).toBe('disk');
  });
});
