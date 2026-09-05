import { describe, it, expect, afterEach } from 'vitest';
import { dictationFromEnv, WHERE_THE_AUDIO_GOES } from '../src/services/dictation.js';

/**
 * Speaking a reason instead of typing it, and where the audio goes.
 *
 * The friction this product is for is that a member states why. Speaking is the
 * one way to make that fast without making it optional. What is held here is
 * that it does not happen unless an institution chose it — because the browser
 * sends the recording away to be transcribed, and a stated reason for a vote is
 * more sensitive than a question to the assistant, which is already off by
 * default for exactly that reason.
 */

const saved = process.env.MAJLIS_DICTATION;

afterEach(() => {
  if (saved === undefined) delete process.env.MAJLIS_DICTATION;
  else process.env.MAJLIS_DICTATION = saved;
});

describe('off unless the institution chose it', () => {
  it('is off where nothing is set', () => {
    delete process.env.MAJLIS_DICTATION;
    expect(dictationFromEnv()).toBe('off');
  });

  it('is off where it is set to off', () => {
    process.env.MAJLIS_DICTATION = 'off';
    expect(dictationFromEnv()).toBe('off');
  });

  it('is on only where it says so', () => {
    process.env.MAJLIS_DICTATION = 'browser';
    expect(dictationFromEnv()).toBe('browser');
  });

  it('refuses a value it does not know rather than defaulting', () => {
    process.env.MAJLIS_DICTATION = 'brwoser';

    /*
     * A typo would otherwise mean an institution that meant to turn this on
     * quietly did not — and the failure is invisible, because a missing control
     * is exactly what a correctly-off setting looks like.
     */
    expect(() => dictationFromEnv()).toThrow(/not one of: off, browser/);
  });

  it('is not inferred from anything else being on', () => {
    delete process.env.MAJLIS_DICTATION;
    const savedKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-not-a-real-key';

    // A key for the assistant says nothing about whether a board is content to
    // have its members' spoken reasons leave the building.
    expect(dictationFromEnv()).toBe('off');

    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedKey;
  });
});

describe('the sentence shown before the first use', () => {
  it('says the recording leaves the machine', () => {
    expect(WHERE_THE_AUDIO_GOES).toContain('sent to the browser maker');
    expect(WHERE_THE_AUDIO_GOES).toContain('does not stay on this machine');
  });

  it('says it does not pass through Majlis, because it does not', () => {
    // Nothing on this server transcribes anything and no audio reaches it.
    expect(WHERE_THE_AUDIO_GOES).toContain('does not pass through Majlis');
  });

  it('leaves the choice with the member rather than with the setting', () => {
    /*
     * The institution turned it on. The member holding the microphone did not,
     * and is entitled to know before they press it.
     */
    expect(WHERE_THE_AUDIO_GOES).toContain('is still yours');
    expect(WHERE_THE_AUDIO_GOES).toContain('Typing is always available');
  });
});
