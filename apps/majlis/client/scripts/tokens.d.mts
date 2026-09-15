/**
 * The checker is plain JavaScript so it can run with `node` and no build step.
 * This is what the test needs in order to import it with types.
 */
export function coloursInCss(text?: string): Map<string, string>;
export function coloursInConfig(text?: string): Map<string, string>;
/** Every colour that disagrees between the two files, as a sentence each. */
export function drift(): string[];
