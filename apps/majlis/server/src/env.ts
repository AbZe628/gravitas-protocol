import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * The env file, from either place a person would reasonably put it.
 *
 * `.env.example` lives in `apps/majlis/`, every instruction in the docs points
 * there, and the server's own working directory is `apps/majlis/server/`
 * because it is started with `npm run dev -w server`. So somebody who followed
 * the instructions exactly put the file where nothing read it — and got no
 * error at all, because an unset variable is a valid configuration here. The
 * installation ran on defaults and reported itself healthy.
 *
 * That is the failure this application refuses everywhere else: a setting that
 * is silently not in effect. Both locations are read now.
 *
 * ── why this is its own module ────────────────────────────────────────────
 *
 * Imports are hoisted and run before any other statement in a module, so
 * calling `dotenv` at the top of `index.ts` would have loaded the file *after*
 * everything `index.ts` imports had already been evaluated. A module whose only
 * job is this side effect, imported first, is the ordinary way to get the
 * ordering right — and it is the reason `import 'dotenv/config'` was there in
 * the first place.
 *
 * Order: the package directory first, so a server-local file still wins over
 * one at the application root. `dotenv` never overwrites a variable that is
 * already set, so what the environment actually passed beats both.
 */

const here = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(here, '../.env') });
config({ path: resolve(here, '../../.env') });
