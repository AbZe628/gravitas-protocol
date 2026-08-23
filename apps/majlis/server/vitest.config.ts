import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
    /*
     * Forks, not threads.
     *
     * better-sqlite3 is a native addon and is not safe to load into several
     * worker threads of one process. Under the default thread pool the worker
     * running the store tests dies with "Worker exited unexpectedly" and takes
     * the run with it — on CI every time, and locally only sometimes, which is
     * the worse of the two failure modes. Each test file gets its own process
     * instead. The suite is small enough that the extra start-up costs less
     * than an intermittent crash.
     */
    pool: 'forks',
  },
});
