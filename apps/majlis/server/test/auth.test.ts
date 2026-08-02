import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { assertConfiguredForProduction, configFromEnv } from '../src/middleware/basicAuth.js';

const USER = 'board';
const PASS = 'correct-horse-battery-staple';
const header = (u: string, p: string) =>
  'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

describe('basic auth covers the whole application', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.BASIC_AUTH_USER = USER;
    process.env.BASIC_AUTH_PASSWORD = PASS;
    app = createApp();
  });

  afterEach(() => {
    delete process.env.BASIC_AUTH_USER;
    delete process.env.BASIC_AUTH_PASSWORD;
    delete process.env.NODE_ENV;
  });

  const protectedRoutes = [
    '/api/boards',
    '/api/rules',
    '/api/matters',
    '/api/briefings',
    '/api/assistant/log',
    '/api/export/demo-board',
  ];

  for (const route of protectedRoutes) {
    it(`401s ${route} without credentials`, async () => {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toMatch(/^Basic realm=/);
      // The board record must not leak in the body of a refusal.
      expect(JSON.stringify(res.body)).not.toMatch(/demo-board|Demonstration/i);
    });

    it(`allows ${route} with correct credentials`, async () => {
      const res = await request(app).get(route).set('Authorization', header(USER, PASS));
      expect(res.status).toBe(200);
    });
  }

  it('exempts only /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    // and it must not carry board data
    expect(JSON.stringify(res.body)).not.toMatch(/demo-board|Demonstration|scholar/i);
  });

  it('rejects a wrong password', async () => {
    const res = await request(app).get('/api/matters').set('Authorization', header(USER, 'wrong'));
    expect(res.status).toBe(401);
  });

  it('rejects a wrong username', async () => {
    const res = await request(app).get('/api/matters').set('Authorization', header('someone', PASS));
    expect(res.status).toBe(401);
  });

  it('rejects a malformed header without throwing', async () => {
    for (const h of ['Basic', 'Basic !!!!', 'Bearer abc', 'Basic ' + Buffer.from('nocolon').toString('base64')]) {
      const res = await request(app).get('/api/matters').set('Authorization', h);
      expect(res.status).toBe(401);
    }
  });

  it('protects the assistant endpoint too', async () => {
    const res = await request(app).post('/api/assistant/ask').send({ question: 'What does a timelock do?' });
    expect(res.status).toBe(401);
  });
});

describe('the server refuses to start unauthenticated in production', () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.BASIC_AUTH_USER;
    delete process.env.BASIC_AUTH_PASSWORD;
  });

  it('throws when credentials are missing and NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => assertConfiguredForProduction()).toThrow(/will not start unauthenticated/i);
  });

  it('throws when only one of the two is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.BASIC_AUTH_USER = USER;
    expect(() => assertConfiguredForProduction()).toThrow();
  });

  it('starts when both are set', () => {
    process.env.NODE_ENV = 'production';
    process.env.BASIC_AUTH_USER = USER;
    process.env.BASIC_AUTH_PASSWORD = PASS;
    expect(() => assertConfiguredForProduction()).not.toThrow();
    expect(configFromEnv()).toMatchObject({ user: USER, password: PASS });
  });

  it('does not block local development', () => {
    expect(() => assertConfiguredForProduction()).not.toThrow();
  });
});
