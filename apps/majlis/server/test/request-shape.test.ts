import { describe, it, expect } from 'vitest';
import { ask, ASSISTANT_MODEL, CLASSIFIER_MODEL } from '../src/services/assistant.js';
import { EXTRACTION_MODEL } from '../src/services/extraction.js';

/**
 * What we actually send.
 *
 * Every other test here stubs the client and checks what comes back, which is
 * the right way to test the gates and the wrong way to notice that the request
 * itself had stopped being valid. For as long as anyone can tell, this
 * application was sending
 *
 *   thinking: { type: 'enabled', budget_tokens: 1536 }
 *
 * which current models reject with a 400 — not a warning, not a degraded
 * answer, a refused request. Thirteen hundred tests passed the whole time,
 * because a stub accepts anything.
 *
 * So this file asserts the shape of the call rather than the shape of the
 * reply. It cannot prove the API accepts it — that needs a key, and keys are
 * the institution's — but it does hold the two things that went stale
 * silently: the parameter that is now rejected, and a model left a generation
 * behind.
 */

interface Captured {
  model: string;
  max_tokens: number;
  thinking?: { type: string; budget_tokens?: number };
}

/** A client that answers plausibly and keeps every request it was given. */
function recorder(): { client: unknown; calls: Captured[] } {
  const calls: Captured[] = [];
  const client = {
    messages: {
      create: async (args: Captured) => {
        calls.push(args);
        // The classifier is asked one thing and must answer one word.
        if (args.model.includes('haiku')) {
          return { content: [{ type: 'text', text: 'NO' }] };
        }
        return {
          content: [
            { type: 'thinking', thinking: 'considering the mechanism', signature: 'sig' },
            { type: 'text', text: 'The registry reads the parameters before each transaction.' },
          ],
        };
      },
    },
  };
  return { client, calls };
}

describe('the request the assistant sends', () => {
  it('asks for adaptive thinking, and never for a fixed budget', async () => {
    const { client, calls } = recorder();
    await ask({ question: 'How does the policy registry read a parameter?', client });

    const main = calls.find((c) => c.model === ASSISTANT_MODEL);
    expect(main).toBeDefined();
    expect(main!.thinking).toEqual({ type: 'adaptive' });

    /*
     * The specific thing that broke. `budget_tokens` is deprecated on 4.6 and
     * rejected outright on everything after it, so its presence is not a style
     * question — it is a request that cannot succeed.
     */
    expect(main!.thinking).not.toHaveProperty('budget_tokens');
  });

  it('leaves the answer room to exist beside the reasoning', async () => {
    const { client, calls } = recorder();
    await ask({ question: 'What does the timelock do?', client });

    const main = calls.find((c) => c.model === ASSISTANT_MODEL)!;

    /*
     * Adaptive thinking spends what it needs from inside `max_tokens`. A
     * ceiling low enough to be eaten by the reasoning produces an empty
     * answer, which this application reports as a transport failure — a fault
     * that would look like the network rather than like a setting.
     */
    expect(main.max_tokens).toBeGreaterThanOrEqual(8192);
  });

  it('sends the classifier to a small model and the question to a capable one', async () => {
    const { client, calls } = recorder();
    await ask({ question: 'How is a hash of the parameters produced?', client });

    // Two calls: the gate, then the answer. The gate must not be the slow part
    // of a refusal.
    expect(calls.map((c) => c.model)).toEqual([CLASSIFIER_MODEL, ASSISTANT_MODEL]);
    expect(CLASSIFIER_MODEL).toContain('haiku');
  });
});

describe('the models this application is pinned to', () => {
  /*
   * Names rather than families, because the failure being guarded against is
   * not "someone chose badly" — it is that nobody looked for a year and the
   * defaults quietly aged out from under the code.
   */
  it('answers on a current model', () => {
    expect(ASSISTANT_MODEL).toBe('claude-opus-5');
  });

  it('reads documents on a current model', () => {
    expect(EXTRACTION_MODEL).toBe('claude-opus-5');
  });

  /*
   * A named list rather than a version pattern. The first version of this
   * test pattern-matched on '-4-' and failed on `claude-haiku-4-5`, which is
   * current — the small model in the newest family is not an old model, and a
   * rule that cannot tell those apart would make somebody "fix" the classifier
   * onto something slower for no reason.
   */
  it('does not name a model that has been superseded', () => {
    const gone = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-3-5-sonnet', 'claude-3-7-sonnet'];
    for (const model of [ASSISTANT_MODEL, CLASSIFIER_MODEL, EXTRACTION_MODEL]) {
      expect(gone).not.toContain(model);
    }
  });
});
