import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { forgetIdentity } from './lib/identity.js';
import { forgetPulse } from './lib/pulse.js';

/*
 * Every test starts as a fresh page load would.
 *
 * Two things are now kept outside React, deliberately: who is looking, and
 * the line that says the record moved. Both used to be fetched once per
 * component — seventy-two identity requests' worth of duplication, ten to
 * twelve on a single screen — and both are now asked once and shared.
 *
 * Shared means they outlive a render, and in a test file that runs a dozen
 * screens in one process they would outlive the test too: twelve tests
 * failed the moment the cache went in, every one of them a test that signs
 * in as somebody else partway through. That is not a test problem. It is the
 * same staleness a real member would hit signing out and back in as
 * somebody else, and `forgetIdentity` exists for both.
 */
beforeEach(() => {
  forgetIdentity();
  forgetPulse();
});
