/**
 * Whether documents may be read by a model at all.
 *
 * Separate from the assistant, and separately off, because they are separate
 * decisions of different size. Sending a member's question to a model run by
 * someone else is one an institution has to make. **Sending the bank's
 * financial statements is a larger one**, and an institution that allowed the
 * first has not thereby allowed the second.
 *
 * So this is its own switch, off by default, and inferring it from the presence
 * of an API key would be exactly the wrong failure mode: an installation that
 * quietly began posting a bank's accounts to a third party because a key
 * happened to be in the environment.
 *
 * ── and the manual path can never be removed ──────────────────────────────
 *
 * A bank that will not send its accounts anywhere types the figures in and
 * loses nothing but time. That is why this can be off and the application still
 * complete, rather than off and the application degraded.
 */

import { extract, type ExtractOptions, type Extraction } from './extraction.js';

export type ReadingKind = 'off' | 'anthropic';

export interface Reading {
  readonly kind: ReadingKind;
  /** False when nothing is attached. Not an error. */
  readonly available: boolean;
  /** Where the document goes, for the interface to be able to say so. */
  readonly processor?: string;
  read(input: ExtractOptions): Promise<Extraction>;
}

/** Thrown rather than returned, so a caller cannot mistake it for an answer. */
export class ReadingUnavailable extends Error {
  readonly code = 'reading_off';
  constructor() {
    super(
      'This installation does not send documents to a reading assistant. That is a setting rather ' +
        'than a fault: an institution decides separately whether the bank’s statements may leave ' +
        'it, and this one has not. The figures are typed in, which is what they always were.',
    );
    this.name = 'ReadingUnavailable';
  }
}

export class ReadingOff implements Reading {
  readonly kind = 'off' as const;
  readonly available = false;

  async read(): Promise<Extraction> {
    throw new ReadingUnavailable();
  }
}

export class AnthropicReading implements Reading {
  readonly kind = 'anthropic' as const;
  readonly available = true;
  readonly processor = 'Anthropic PBC (United States)';

  read(input: ExtractOptions): Promise<Extraction> {
    return extract(input);
  }
}

/**
 * Chosen explicitly, and never inferred.
 *
 * `MAJLIS_READING=anthropic` turns it on. Unlike the assistant — which infers
 * from an existing key so an upgrade does not silently remove something an
 * installation was using — nothing here infers, because there is nothing to
 * preserve: this has never been on anywhere, and a bank's accounts are not
 * something to start sending by default.
 */
export function readingFromEnv(): Reading {
  const chosen = process.env.MAJLIS_READING?.trim().toLowerCase();
  if (chosen === 'anthropic' && process.env.ANTHROPIC_API_KEY?.trim()) {
    return new AnthropicReading();
  }
  return new ReadingOff();
}
