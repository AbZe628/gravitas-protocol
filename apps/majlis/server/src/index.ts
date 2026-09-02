import 'dotenv/config';
import { createApp } from './app.js';
import { assertConfiguredForProduction } from './middleware/basicAuth.js';
import { enforcementFromEnv } from './services/enforcement.js';
import { comprehensionFromEnv } from './services/comprehension.js';
import { storeFromEnv } from './store/index.js';
import { startSweeping } from './services/sweep.js';

const port = Number(process.env.PORT ?? 4000);
assertConfiguredForProduction();

/*
 * Built here rather than inside createApp so a failure to open the record is a
 * refusal to start, not a request that fails later with the process apparently
 * healthy. storeFromEnv refuses an in-memory record in production for the same
 * reason: a governance system that silently forgets is worse than one that will
 * not start.
 */
const store = storeFromEnv();
const app = createApp(store);

/*
 * Deadlines pass whether or not anyone is looking. A restriction whose
 * ratification window has closed must read as lapsed rather than as in force,
 * or the record says a rule is operative when the board rules it expired.
 * Runs once now and every five minutes after.
 */
const stopSweeping = startSweeping(store);

const server = app.listen(port, () => {
  const where = process.env.MAJLIS_DB?.trim();
  const board = process.env.MAJLIS_MEMBERS?.trim();

  console.log(`Gravitas Majlis — Stage Two, the board decides here — listening on :${port}`);

  console.log(
    where
      ? `Record: ${where}`
      : 'Record: in memory. Every decision is lost when this process stops. Set MAJLIS_DB.',
  );

  /*
   * The single most confusing state this can be in, and it used to say nothing
   * about it: with no member credentials the shared login authenticates as an
   * observer, every control is hidden because none of them would be permitted,
   * and the application looks broken to someone who was told it was finished.
   *
   * Nothing is wrong when this prints. It is a board that has not been given
   * its keys, and that is worth one loud line at boot rather than an afternoon
   * of wondering.
   */
  if (!board) {
    console.warn(
      'MAJLIS_MEMBERS is not set: everyone authenticates as an observer, so no one can ' +
        'deliberate, vote or object. Generate a board with: npm run members -w server',
    );
  } else {
    const count = board.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length;
    console.log(`Board: ${count} member credential${count === 1 ? '' : 's'} configured.`);
  }

  /*
   * What this installation is. An operator reading a log should not have to
   * infer from the absence of a warning that nothing is attached — and nothing
   * attached is the ordinary arrangement, so it is reported rather than warned
   * about.
   */
  const enforcement = enforcementFromEnv();
  const comprehension = comprehensionFromEnv();

  console.log(
    enforcement.kind === 'none'
      ? 'Enforcement: none. Decisions are recorded here and carried out elsewhere.'
      : `Enforcement: ${enforcement.kind}.`,
  );

  console.log(
    comprehension.available
      ? `Assistant: ${comprehension.kind}. Questions are sent to ${comprehension.processor}.`
      : 'Assistant: off. Questions of mechanism go to the technical liaison.',
  );
});

/*
 * A write may be queued when the platform asks the process to stop. Closing the
 * store waits for it, so a redeploy cannot land between a vote being accepted
 * and that vote reaching the file.
 */
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    stopSweeping();
    server.close(() => {
      void store.close().then(() => process.exit(0));
    });
  });
}
