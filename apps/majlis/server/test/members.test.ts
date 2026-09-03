import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import {
  MemberConfigError,
  hashPassword,
  mayAnswerAsLiaison,
  mayDeliberate,
  mayConvene,
  mayOpenMatter,
  mayRecordInstitutionAct,
  mayVote,
  parseMembers,
  verifyPassword,
} from '../src/auth/members.js';

const saved = { members: process.env.MAJLIS_MEMBERS, user: process.env.BASIC_AUTH_USER, pass: process.env.BASIC_AUTH_PASSWORD };
afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

describe('passwords are hashed, never stored', () => {
  it('a hash verifies against its own password and nothing else', () => {
    const secret = hashPassword('a board credential');
    expect(verifyPassword('a board credential', secret)).toBe(true);
    expect(verifyPassword('a board credentia', secret)).toBe(false);
    expect(verifyPassword('', secret)).toBe(false);
  });

  it('the same password hashed twice gives different hashes', () => {
    // Salted, so a repeated password is not visible as a repeated hash.
    expect(hashPassword('same password')).not.toBe(hashPassword('same password'));
  });

  it('a malformed secret verifies against nothing', () => {
    for (const junk of ['', 'plaintext', 'scrypt$only-two', 'md5$aa$bb', 'scrypt$$']) {
      expect(verifyPassword('anything', junk)).toBe(false);
    }
  });
});

describe('reading the member list', () => {
  const secret = hashPassword('a board credential');

  it('parses entries and ignores blanks and comments', () => {
    const members = parseMembers(`
      # the board
      member-a:signatory:${secret}

      member-b:advisory:${secret};member-c:liaison:${secret}
    `);
    expect(members.size).toBe(3);
    expect(members.ids().sort()).toEqual(['member-a', 'member-b', 'member-c']);
  });

  it('refuses a plaintext password rather than accepting it', () => {
    // The failure that matters: someone pastes the password itself.
    expect(() => parseMembers('member-a:signatory:hunter2')).toThrow(MemberConfigError);
    expect(() => parseMembers('member-a:signatory:hunter2')).toThrow(/Never put a password here/);
  });

  it('refuses an unknown role', () => {
    expect(() => parseMembers(`member-a:chairman:${secret}`)).toThrow(/is not a role/);
  });

  it('refuses a malformed line rather than skipping it', () => {
    // A member silently dropped for a typo is a member who cannot vote,
    // discovered at the worst possible moment.
    expect(() => parseMembers('member-a')).toThrow(MemberConfigError);
    expect(() => parseMembers('member-a:signatory')).toThrow(MemberConfigError);
  });

  it('refuses the same member twice', () => {
    expect(() => parseMembers(`m:signatory:${secret}\nm:observer:${secret}`)).toThrow(/appears twice/);
  });
});

describe('authenticating a member', () => {
  const secret = hashPassword('a board credential');
  const members = parseMembers(`member-a:signatory:${secret}\nwatcher:observer:${secret}`);

  it('returns the identity and the role', () => {
    expect(members.authenticate('member-a', 'a board credential')).toEqual({
      scholarId: 'member-a',
      role: 'signatory',
    });
  });

  it('a wrong password and an unknown member are the same answer', () => {
    expect(members.authenticate('member-a', 'wrong')).toBeNull();
    expect(members.authenticate('nobody', 'a board credential')).toBeNull();
  });
});

describe('what each role may do', () => {
  it('only a signatory votes or objects', () => {
    expect(mayVote('signatory')).toBe(true);
    for (const role of ['advisory', 'liaison', 'observer'] as const) {
      expect(mayVote(role)).toBe(false);
    }
  });

  it('everyone on the board deliberates; an observer watches', () => {
    for (const role of ['signatory', 'advisory', 'liaison'] as const) {
      expect(mayDeliberate(role)).toBe(true);
      expect(mayOpenMatter(role)).toBe(true);
    }
    expect(mayDeliberate('observer')).toBe(false);
    expect(mayOpenMatter('observer')).toBe(false);
  });

  it('only a liaison answers as one', () => {
    expect(mayAnswerAsLiaison('liaison')).toBe(true);
    for (const role of ['signatory', 'advisory', 'observer'] as const) {
      expect(mayAnswerAsLiaison(role)).toBe(false);
    }
  });
});

describe('over HTTP', () => {
  const secret = hashPassword('a board credential');
  const auth = (u: string, p: string) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

  it('a member credential is accepted and a wrong one is not', async () => {
    process.env.MAJLIS_MEMBERS = `member-a:signatory:${secret}`;
    delete process.env.BASIC_AUTH_USER;
    delete process.env.BASIC_AUTH_PASSWORD;
    const app = createApp(new MemoryStore());

    await request(app).get('/api/boards').set('Authorization', auth('member-a', 'a board credential')).expect(200);
    await request(app).get('/api/boards').set('Authorization', auth('member-a', 'wrong')).expect(401);
    await request(app).get('/api/boards').expect(401);
  });

  it('health stays reachable without credentials, for the platform check', async () => {
    process.env.MAJLIS_MEMBERS = `member-a:signatory:${secret}`;
    const app = createApp(new MemoryStore());
    await request(app).get('/api/health').expect(200);
  });

  it('the shared credential still opens the record, as an observer', async () => {
    delete process.env.MAJLIS_MEMBERS;
    process.env.BASIC_AUTH_USER = 'board';
    process.env.BASIC_AUTH_PASSWORD = 'shared secret';
    const app = createApp(new MemoryStore());

    // Stage One behaviour is unchanged: it reads. What it cannot do is be
    // attributed, which is why it will not be allowed to write.
    await request(app).get('/api/boards').set('Authorization', auth('board', 'shared secret')).expect(200);
    await request(app).get('/api/boards').set('Authorization', auth('board', 'wrong')).expect(401);
  });

  it('members win when both are configured', async () => {
    process.env.MAJLIS_MEMBERS = `member-a:signatory:${secret}`;
    process.env.BASIC_AUTH_USER = 'board';
    process.env.BASIC_AUTH_PASSWORD = 'shared secret';
    const app = createApp(new MemoryStore());

    await request(app).get('/api/boards').set('Authorization', auth('member-a', 'a board credential')).expect(200);
    await request(app).get('/api/boards').set('Authorization', auth('board', 'shared secret')).expect(200);
  });
});

describe('an office is held, not ranked', () => {
  const h = hashPassword('a board credential');

  it('parses role+office without changing how any older entry reads', () => {
    const m = parseMembers(`member-a:signatory+chair:${h}\nmember-b:signatory:${h}`);
    expect(m.authenticate('member-a', 'a board credential')?.office).toBe('chair');
    expect(m.authenticate('member-b', 'a board credential')?.office).toBeUndefined();
  });

  it('reads an office alongside an institution', () => {
    const m = parseMembers(`alpha/member-a:signatory+secretary:${h}`);
    const who = m.authenticate('alpha/member-a', 'a board credential');
    expect(who?.scholarId).toBe('member-a');
    expect(who?.institutionId).toBe('alpha');
    expect(who?.office).toBe('secretary');
  });

  it('refuses a chair who could not carry a vote', () => {
    expect(() => parseMembers(`member-a:advisory+chair:${h}`)).toThrow(/must be a signatory/);
    expect(() => parseMembers(`member-a:observer+chair:${h}`)).toThrow(/must be a signatory/);
  });

  it('allows a secretary who does not vote, because the office is not a vote', () => {
    expect(parseMembers(`member-a:advisory+secretary:${h}`).size).toBe(1);
  });

  it('refuses an office it does not recognise', () => {
    expect(() => parseMembers(`member-a:signatory+president:${h}`)).toThrow(/is not an office/);
  });

  it('refuses two members holding the same office', () => {
    expect(() => parseMembers(`member-a:signatory+chair:${h}\nmember-b:signatory+chair:${h}`))
      .toThrow(/Only one member may hold an office/);
  });

  it('lets two institutions each have their own chair', () => {
    const m = parseMembers(`alpha/member-a:signatory+chair:${h}\nbeta/member-a:signatory+chair:${h}`);
    expect(m.size).toBe(2);
  });

  it('gives the institution’s own steps to the secretary and the liaison, and nobody else', () => {
    expect(mayRecordInstitutionAct('advisory', 'secretary')).toBe(true);
    expect(mayRecordInstitutionAct('liaison')).toBe(true);
    expect(mayRecordInstitutionAct('signatory')).toBe(false);
    expect(mayRecordInstitutionAct('signatory', 'chair')).toBe(false);
    expect(mayRecordInstitutionAct('observer')).toBe(false);
  });

  it('gives the chair procedure and nothing more', () => {
    expect(mayConvene('chair')).toBe(true);
    expect(mayConvene('secretary')).toBe(false);
    expect(mayConvene()).toBe(false);
    // The office widens nothing about deciding.
    expect(mayVote('advisory')).toBe(false);
  });
});
