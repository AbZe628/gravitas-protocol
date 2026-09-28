import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { configure } from '@testing-library/react';
import { forgetIdentity } from './lib/identity.js';
import { forgetPulse } from './lib/pulse.js';
import { forgetHealth } from './lib/health.js';
import { forgetKept } from './lib/kept.js';
import { forgetList } from './lib/split.js';
/*
 * Arabic and Urdu are fetched when chosen in the application; a test renders
 * in them in the same tick it asks, so all three are held from the start.
 */
import './locales/all.js';

/*
 * How long a test waits for a screen to say something.
 *
 * Screens are fetched when first drawn now (see `screens.ts`), so the first
 * test in a file that opens one also waits for that screen's module to be
 * read and compiled. Alone that is a few hundred milliseconds; with fifty
 * files running side by side it was once past the one second a `findBy`
 * waits by default, and a test failed for having been scheduled behind the
 * others. The assertions are unchanged — a screen that never says the thing
 * still fails, four seconds later.
 */
configure({ asyncUtilTimeout: 4000 });

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
/*
 * What this installation is, forgotten with the rest. It was written to be
 * forgettable and then never was, so a file that renders one screen against
 * an installation with the assistant on and again with it off got the first
 * answer twice — the second case passing on the first case's data, which is
 * a test that proves nothing. Found by exactly that pair.
 */
beforeEach(() => {
  forgetIdentity();
  forgetPulse();
  forgetHealth();
  forgetKept();
  forgetList();
});
