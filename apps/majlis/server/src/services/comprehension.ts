import { ask, type AskOptions, type AskResult } from './assistant.js';

/**
 * Whether there is an assistant at all.
 *
 * The assistant sends the text of a member's question to a model run by someone
 * else. **Some institutions will forbid that outright**, and for good reason: a
 * board's deliberation is among the most sensitive text an institution holds.
 * That has to be a configuration rather than a rebuild, and it has to be off by
 * default — an installation that quietly starts sending deliberation to a
 * third party because a key happened to be in the environment is the wrong
 * failure mode.
 *
 * When it is off, the application says so plainly instead of reporting a
 * malfunction. "There is no assistant here" and "the assistant is broken" are
 * different states and a scholar deserves to be told which.
 */

export type ComprehensionKind = 'off' | 'anthropic';

export interface Comprehension {
  readonly kind: ComprehensionKind;
  /** False when nothing is attached. Not an error. */
  readonly available: boolean;
  /** Where the text goes, for the interface to be able to say so. */
  readonly processor?: string;
  ask(input: AskOptions): Promise<AskResult>;
}

export class AssistantOff implements Comprehension {
  readonly kind = 'off' as const;
  readonly available = false;

  async ask(): Promise<AskResult> {
    throw new AssistantUnavailable();
  }
}

/** Thrown rather than returned, so a caller cannot mistake it for an answer. */
export class AssistantUnavailable extends Error {
  readonly code = 'assistant_off';
  constructor() {
    super(
      'No comprehension assistant is configured for this installation. Questions of mechanism go ' +
        'to the technical liaison, who answers them in the deliberation where the board can see ' +
        'the answer and disagree with it.',
    );
    this.name = 'AssistantUnavailable';
  }
}

export class AnthropicComprehension implements Comprehension {
  readonly kind = 'anthropic' as const;
  readonly available = true;
  readonly processor = 'Anthropic PBC (United States)';

  ask(input: AskOptions): Promise<AskResult> {
    return ask(input);
  }
}

/**
 * Chosen explicitly by `MAJLIS_ASSISTANT`, or inferred from the key already
 * present so an existing installation does not lose its assistant on upgrade.
 *
 * A fresh installation gets nothing, and nothing is a complete installation.
 */
export function comprehensionFromEnv(): Comprehension {
  const chosen = process.env.MAJLIS_ASSISTANT?.trim().toLowerCase();

  if (chosen === 'off') return new AssistantOff();
  if (chosen === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      throw new Error(
        'MAJLIS_ASSISTANT is "anthropic" but ANTHROPIC_API_KEY is not set. Refusing to start ' +
          'rather than serving an assistant that fails on the first question.',
      );
    }
    return new AnthropicComprehension();
  }

  if (chosen) {
    throw new Error(
      `MAJLIS_ASSISTANT is "${chosen}", which is not one of: off, anthropic.`,
    );
  }

  return process.env.ANTHROPIC_API_KEY?.trim() ? new AnthropicComprehension() : new AssistantOff();
}
