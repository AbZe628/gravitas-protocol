import { describe, expect, it } from 'vitest';
import { drift, coloursInCss, coloursInConfig } from '../scripts/tokens.mjs';

/**
 * The two files that hold the palette must agree, and this is where that fails.
 *
 * `tailwind.config.js` warned at the top that the duplication *had already
 * caused one drift*. A warning in a comment is a note somebody reads once; a
 * test is a thing that stops them. So the check runs here, where a disagreement
 * breaks the build rather than showing up as one wrong pixel in a screenshot
 * three weeks later.
 */
describe('the palette is written once', () => {
  it('reaches both files rather than passing on an empty read', () => {
    /*
     * The fault a guard in this repository had for weeks: it walked almost
     * nothing and reported success. If either read comes back thin, this fails
     * before the comparison gets a chance to pass by finding nothing.
     */
    expect(coloursInCss().size).toBeGreaterThan(18);
    expect(coloursInConfig().size).toBeGreaterThan(18);
  });

  it('finds no colour that disagrees between them', () => {
    expect(drift()).toEqual([]);
  });
});
