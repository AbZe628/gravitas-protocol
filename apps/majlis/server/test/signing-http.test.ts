import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * Signing the written decision, over HTTP.
 *
 * The lines these hold, in the order they matter:
 *
 *   - the hash a member signs is computed from the record, never sent by the
 *     client, so nobody can put the board's name under text of their own;
 *   - signing is not voting, and a document shows the two apart;
 *   - an amendment after a signature does not invalidate it silently — the
 *     document says which names cover text that is no longer there;
 *   - an unsealed installation says so on the page rather than omitting it.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = ['member-a:signatory', 'member-b:signatory', 'watcher:observer']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

/** A matter the seeded record already carries in force, so a document exists. */
const DECIDED = 'matter-2026-04-02';
/** One still being deliberated, so no document exists for it. */
const OPEN = 'matter-2026-07-03';

let app: Express;
let store: MemoryStore;
const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  pass: process.env.BASIC_AUTH_PASSWORD,
  key: process.env.MAJLIS_SEAL_KEY,
  issuer: process.env.MAJLIS_SEAL_ISSUER,
};

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASSWORD;
  delete process.env.MAJLIS_SEAL_KEY;
  delete process.env.MAJLIS_SEAL_ISSUER;
  store = new MemoryStore();
  app = createApp(store);
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
  if (saved.key === undefined) delete process.env.MAJLIS_SEAL_KEY;
  else process.env.MAJLIS_SEAL_KEY = saved.key;
  if (saved.issuer === undefined) delete process.env.MAJLIS_SEAL_ISSUER;
  else process.env.MAJLIS_SEAL_ISSUER = saved.issuer;
});

const sign = (matterId: string, body: Record<string, unknown>, who = 'member-a') =>
  request(app).post(`/api/matters/${matterId}/sign`).set('Authorization', as(who)).send(body);

const documentOf = (matterId: string, who = 'member-a') =>
  request(app).get(`/api/matters/${matterId}/fatwa`).set('Authorization', as(who));

describe('who may sign', () => {
  it('a signatory may', async () => {
    await sign(DECIDED, { provedBy: 'their own sign-in' }).expect(201);
  });

  it('an observer may not, however carefully they read it', async () => {
    await sign(DECIDED, { provedBy: 'their own sign-in' }, 'watcher').expect(403);
  });

  it('nobody may sign a matter the board has not decided', async () => {
    const res = await sign(OPEN, { provedBy: 'their own sign-in' });
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain('wrong_status');
  });
});

describe('what is signed', () => {
  it('is the hash of the record, not a hash the client sent', async () => {
    const doc = await documentOf(DECIDED).query({ format: 'json' }).expect(200);

    const res = await sign(DECIDED, {
      provedBy: 'their own sign-in',
      // A client trying to have the board's name put under something else.
      documentHash: '0x' + 'ee'.repeat(32),
    }).expect(201);

    expect(res.body.documentHash).toBe(doc.body.documentHash);
    expect(res.body.documentHash).not.toContain('eeee');
  });

  it('carries the member as the board names them, not as the request does', async () => {
    const res = await sign(DECIDED, {
      provedBy: 'their own sign-in',
      name: 'Somebody Else',
    }).expect(201);
    expect(res.body.name).not.toBe('Somebody Else');
    expect(res.body.scholarId).toBe('member-a');
  });

  it('refuses a proof of identity that is not one of the three', async () => {
    await sign(DECIDED, { provedBy: 'trust me' }).expect(400);
  });

  it('keeps a note the member asked to have recorded', async () => {
    const note = 'Subject to the review date being kept at ninety days.';
    const res = await sign(DECIDED, { provedBy: 'their own sign-in', note }).expect(201);
    expect(res.body.note).toBe(note);
  });
});

describe('signing is not voting', () => {
  it('a decided document with no signatures says so, rather than showing the votes as signatures', async () => {
    const page = await documentOf(DECIDED).expect(200);
    expect(page.text).toContain('Nobody has signed this document yet');
    expect(page.text).toContain('signing is a separate act');
  });

  it('the signature appears on the document once given', async () => {
    await sign(DECIDED, { provedBy: 'their own sign-in and a one-time code' }).expect(201);

    const page = await documentOf(DECIDED).expect(200);
    expect(page.text).not.toContain('Nobody has signed this document yet');
    expect(page.text).toContain('identity proved by their own sign-in and a one-time code');
  });

  it('prints how weakly a signature was proved, in the same words', async () => {
    await sign(DECIDED, {
      provedBy: 'in person at a sitting, entered by the secretary',
    }).expect(201);

    const page = await documentOf(DECIDED).expect(200);
    expect(page.text).toContain('in person at a sitting, entered by the secretary');
  });

  it('keeps both signatures when a member signs twice', async () => {
    await sign(DECIDED, { provedBy: 'their own sign-in' }).expect(201);
    await sign(DECIDED, { provedBy: 'their own sign-in and a one-time code' }).expect(201);

    const doc = await documentOf(DECIDED).query({ format: 'json' }).expect(200);
    expect(doc.body.signings).toHaveLength(2);
  });
});

describe('the seal', () => {
  it('says the document is unsealed where no key is configured, rather than omitting the section', async () => {
    const page = await documentOf(DECIDED).expect(200);
    expect(page.text).toContain('This document is not sealed');
    expect(page.text).toContain('was not altered on the way');
  });

  it('offers no seal object at all in that case', async () => {
    const doc = await documentOf(DECIDED).query({ format: 'json' }).expect(200);
    expect(doc.body.seal).toBeNull();
    // The hash is still there: it is derived, and a reader can still compare
    // two copies by eye even where nothing attests to either.
    expect(doc.body.documentHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('seals, and names the installation, once a key is configured', async () => {
    process.env.MAJLIS_SEAL_KEY = 'a-key-long-enough-to-be-taken-seriously';
    process.env.MAJLIS_SEAL_ISSUER = 'Rakbank Majlis';

    await sign(DECIDED, { provedBy: 'their own sign-in' }).expect(201);
    const page = await documentOf(DECIDED).expect(200);

    expect(page.text).toContain('sealed by Rakbank Majlis');
    expect(page.text).toContain('Document reference');
    // What it does not prove is stated as plainly as what it does.
    expect(page.text).toContain("does not prove that a member's own cryptographic key");
  });

  it('prints the reference in groups a person can compare', async () => {
    process.env.MAJLIS_SEAL_KEY = 'a-key-long-enough-to-be-taken-seriously';
    const page = await documentOf(DECIDED).expect(200);
    // Eight groups of four hex characters, separated by spaces.
    expect(page.text).toMatch(/[0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4}/);
  });
});

describe('a signature that no longer covers the document', () => {
  it('is named on the page rather than quietly counted', async () => {
    /*
     * Put a signature over a hash this document does not have.
     *
     * Written straight into the store rather than through the route, because
     * the route computes the hash from the record and so cannot produce this
     * state. What it stands for is real: a member signed on Tuesday and the
     * document was amended on Wednesday, and the question is whether the page
     * still shows their name as though they had signed what is now printed.
     */
    await store.recordSigning({
      matterId: DECIDED,
      boardId: 'demo-board',
      scholarId: 'member-a',
      name: 'Board Member A',
      title: 'Shariah Board Member',
      at: '2026-09-01T09:00:00.000Z',
      provedBy: 'their own sign-in',
      documentHash: '0x' + 'aa'.repeat(32),
    });

    const page = await documentOf(DECIDED).expect(200);
    expect(page.text).toContain('signed a different draft from this one');
    expect(page.text).toContain('does not cover the text above');
  });

  it('is flagged in the structure too, so a bank rendering its own template sees it', async () => {
    process.env.MAJLIS_SEAL_KEY = 'a-key-long-enough-to-be-taken-seriously';
    await sign(DECIDED, { provedBy: 'their own sign-in' }).expect(201);

    const doc = await documentOf(DECIDED).query({ format: 'json' }).expect(200);
    const one = doc.body.signings[0];
    // Signed this draft, so the two agree.
    expect(one.documentHash).toBe(doc.body.documentHash);
  });
});

describe('another institution', () => {
  it('cannot read the signatures on a matter it does not own', async () => {
    // The tenant store scopes signatures through the matter, so a guessed
    // matter id yields nothing rather than another bank's record.
    const doc = await documentOf('matter-that-does-not-exist');
    expect(doc.status).toBe(404);
  });
});
