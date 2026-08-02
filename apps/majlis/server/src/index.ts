import 'dotenv/config';
import { createApp } from './app.js';
import { assertConfiguredForProduction } from './middleware/basicAuth.js';

const port = Number(process.env.PORT ?? 4000);
assertConfiguredForProduction();

const app = createApp();

app.listen(port, () => {
  console.log(`Gravitas Majlis — Stage One (read-only) listening on :${port}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is not set: the comprehension assistant will return 502.');
  }
});
