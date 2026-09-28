/**
 * The two halves of the passage, written as steps rather than as sentences.
 *
 * `passage.ts` decides what state each step is in; this says what each step
 * *is*. They were one file and the sentences were English literals inside the
 * logic, which made the logic hard to read and the sentences impossible to
 * translate. Splitting them means the reasoning above is about matters and
 * conditions, and the words are somewhere a translator can find them — which
 * is to say, in the interface's dictionary, under the keys named here.
 */

/**
 * Every step this file can produce, and nothing else.
 *
 * A union rather than a string, so a step key that has no sentence behind it
 * is a compile error instead of a screen reading `step.condtions.act`.
 */
export type StepKey =
  | 'asked'
  | 'mechanism'
  | 'not_decided'
  | 'shape'
  | 'conditions'
  | 'rests_on'
  | 'terms'
  | 'deliberation'
  | 'open_vote'
  | 'positions'
  | 'close'
  | 'timelock'
  | 'fatwa';

/** The order the shaping steps are reported in. A set, not a sequence. */
export const SHAPING: readonly StepKey[] = [
  'asked',
  'mechanism',
  'not_decided',
  'shape',
  'conditions',
  'rests_on',
  'terms',
];

/** The order deciding actually happens in, which the lifecycle refuses to reorder. */
export const DECIDING: readonly StepKey[] = [
  'deliberation',
  'open_vote',
  'positions',
  'close',
  'timelock',
  'fatwa',
];
