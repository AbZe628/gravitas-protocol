import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memory.js';
import {
  NoEnforcement,
  GravitasRegistryEnforcement,
  enforcementFromEnv,
} from '../src/services/enforcement.js';
import {
  AssistantOff,
  AnthropicComprehension,
  AssistantUnavailable,
  comprehensionFromEnv,
} from '../src/services/comprehension.js';

/**
 * Majlis is a stand-alone product. A Shariah board inside a conventional bank
 * has the same problem and no chain anywhere near it, and that board is the
 * larger market — so **an installation with nothing attached is the ordinary
 * one**, not a degraded one, and these tests are what hold that.
 */

const KEYS = ['MAJLIS_ENFORCEMENT', 'MAJLIS_ASSISTANT', 'POLICY_REGISTRY_ADDRESS', 'ANTHROPIC_API_KEY'];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

// ── what gets chosen ──────────────────────────────────────────────────────

describe('nothing is attached unless something says so', () => {
  it('a fresh installation enforces nothing and has no assistant', () => {
    expect(enforcementFromEnv()).toBeInstanceOf(NoEnforcement);
    expect(comprehensionFromEnv()).toBeInstanceOf(AssistantOff);
  });

  /*
   * An installation configured before these adapters existed must not silently
   * lose its chain read or its assistant on upgrade.
   */
  it('infers what an existing installation already had', () => {
    process.env.POLICY_REGISTRY_ADDRESS = '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23';
    process.env.ANTHROPIC_API_KEY = 'sk-test';

    expect(enforcementFromEnv()).toBeInstanceOf(GravitasRegistryEnforcement);
    expect(comprehensionFromEnv()).toBeInstanceOf(AnthropicComprehension);
  });

  /* An explicit choice beats an inference, in both directions. */
  it('an explicit off wins over a key that happens to be present', () => {
    process.env.POLICY_REGISTRY_ADDRESS = '0xabc';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    process.env.MAJLIS_ENFORCEMENT = 'none';
    process.env.MAJLIS_ASSISTANT = 'off';

    expect(enforcementFromEnv()).toBeInstanceOf(NoEnforcement);
    expect(comprehensionFromEnv()).toBeInstanceOf(AssistantOff);
  });

  it('refuses a name it does not recognise rather than guessing', () => {
    process.env.MAJLIS_ENFORCEMENT = 'ethereum';
    expect(() => enforcementFromEnv()).toThrow(/not one of/);

    delete process.env.MAJLIS_ENFORCEMENT;
    process.env.MAJLIS_ASSISTANT = 'openai';
    expect(() => comprehensionFromEnv()).toThrow(/not one of/);
  });

  /*
   * Serving an assistant that fails on the first question is worse than
   * refusing to start: the failure arrives in front of a scholar rather than in
   * front of whoever configured it.
   */
  it('refuses to start an assistant it cannot actually run', () => {
    process.env.MAJLIS_ASSISTANT = 'anthropic';
    expect(() => comprehensionFromEnv()).toThrow(/ANTHROPIC_API_KEY/);
  });
});

// ── what an unattached installation reports ───────────────────────────────

describe('an installation with nothing attached', () => {
  const bank = () => createApp(new MemoryStore(), new NoEnforcement(), new AssistantOff());

  it('is healthy, and says what it is rather than what it is missing', async () => {
    const res = await request(bank()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.enforcement).toBe('none');
    expect(res.body.assistantKind).toBe('off');
    // The things that make it a governance record are unaffected.
    expect(res.body.governanceWrites).toBe(true);
    expect(res.body.signingAuthority).toBe(false);
  });

  it('reports nothing attached without calling it an error', async () => {
    const res = await request(bank()).get('/api/enforcement');

    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(false);
    expect(res.body.kind).toBe('none');
    expect(res.body.error).toBeUndefined();
    expect(res.body.reachable).toBeUndefined();
  });

  /* The route an existing installation is already calling still answers. */
  it('keeps answering at the old address', async () => {
    const res = await request(bank()).get('/api/registry');
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe('none');
  });

  /*
   * "There is no assistant here" and "the assistant is broken" are different
   * states and a scholar deserves to be told which. 501 says the installation
   * does not implement it; 502 would say it tried and failed.
   */
  it('says there is no assistant rather than that one failed', async () => {
    const res = await request(bank())
      .post('/api/assistant/ask')
      .send({ question: 'What does the registry do when it is paused?' });

    expect(res.status).toBe(501);
    expect(res.body.error).toBe('assistant_off');
    expect(res.body.message).toMatch(/technical liaison/i);
  });

  it('still serves the record it exists to keep', async () => {
    const app = bank();
    expect((await request(app).get('/api/boards')).status).toBe(200);
    expect((await request(app).get('/api/matters')).status).toBe(200);
    expect((await request(app).get('/api/search?q=asset')).status).toBe(200);
  });
});

describe('the off assistant refuses rather than returning nothing', () => {
  it('throws, so a caller cannot mistake silence for an answer', async () => {
    await expect(new AssistantOff().ask()).rejects.toBeInstanceOf(AssistantUnavailable);
  });

  it('names where a question of mechanism should go instead', async () => {
    await expect(new AssistantOff().ask()).rejects.toThrow(/liaison/i);
  });
});
