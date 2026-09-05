/**
 * Whether a member may speak their reasoning instead of typing it.
 *
 * Writing a reason with every vote is the friction this product is for, and it
 * is also the slowest thing a scholar does here. Speaking it is the one way to
 * make that fast without making it optional — the words are still theirs, still
 * fresh, still in their own register. Nothing is pre-filled, suggested or
 * inherited, and no model writes a fiqh reason for anybody.
 *
 * ── so why is it off by default ───────────────────────────────────────────
 *
 * Because of where the audio goes. The browser's own speech recognition is not
 * local in the browser most people use it in: Chrome sends the recording to
 * Google to be transcribed. A member's stated reason for a vote is more
 * sensitive than a question to the assistant, and the assistant is already off
 * unless an institution turns it on for exactly this reason — some of them
 * forbid it outright, and a board's deliberation is among the most sensitive
 * text an institution holds.
 *
 * Shipping it on by default would mean a bank discovered afterwards that its
 * board's reasoning had been leaving the building. So: a setting, off unless
 * chosen, and **absent rather than disabled** where it is off — the same rule
 * as the vault, the assistant and document reading.
 *
 * Where it is on, the interface says where the audio goes before the first use.
 * An institution may have decided this is acceptable; the member holding the
 * microphone has not, and is entitled to know.
 *
 * ── it is a browser capability, not a service ─────────────────────────────
 *
 * Nothing on this server transcribes anything, and no audio ever reaches it.
 * This module reports a setting so an interface can decide whether to offer a
 * control, which is the whole of its job.
 */

export type DictationKind = 'off' | 'browser';

export const DICTATION_KINDS: readonly DictationKind[] = ['off', 'browser'];

/**
 * Where the audio goes, in the words an interface shows before the first use.
 *
 * Stated by the server rather than written into the client so that one sentence
 * describes the installation, and changing what is true about it is a change in
 * one place.
 */
export const WHERE_THE_AUDIO_GOES =
  'Dictation uses your browser’s own speech recognition. In most browsers that ' +
  'means the recording is sent to the browser maker to be transcribed — it does ' +
  'not stay on this machine and it does not pass through Majlis. Your ' +
  'institution has turned this on; whether to use it for a particular reason is ' +
  'still yours. Typing is always available and sends nothing anywhere.';

export function dictationFromEnv(): DictationKind {
  const chosen = process.env.MAJLIS_DICTATION?.trim().toLowerCase();

  if (chosen === 'browser') return 'browser';
  if (!chosen || chosen === 'off') return 'off';

  /*
   * Refused rather than defaulted.
   *
   * A typo here would otherwise mean an institution that meant to turn this on
   * quietly did not — and unlike a wrong colour, the failure is invisible: the
   * control is absent, which is exactly what it looks like when the setting is
   * working correctly.
   */
  throw new Error(
    `MAJLIS_DICTATION is "${chosen}", which is not one of: off, browser. ` +
      'Leaving it unset means off, which is the default and sends nothing anywhere.',
  );
}
