import 'dotenv/config';
import { createApp } from './app.js';
import { assertConfiguredForProduction } from './middleware/basicAuth.js';
import { storeFromEnv } from './store/index.js';

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

const server = app.listen(port, () => {
  const where = process.env.MAJLIS_DB?.trim();
  // Still read-only: the record is durable now, but no route writes a decision
  // yet. This line changes when that does, and not before.
  console.log(`Gravitas Majlis — Stage One, durable record — listening on :${port}`);
  console.log(
    where
      ? `Record: ${where}`
      : 'Record: in memory. It will not survive a restart. Set MAJLIS_DB to keep it.',
  );
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is not set: the comprehension assistant will return 502.');
  }
});

/*
 * A write may be queued when the platform asks the process to stop. Closing the
 * store waits for it, so a redeploy cannot land between a vote being accepted
 * and that vote reaching the file.
 */
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void store.close().then(() => process.exit(0));
    });
  });
}
