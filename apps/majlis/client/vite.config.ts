import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      /*
       * The port the API is on. Unset, it is the ordinary one — so nothing
       * changes for anybody. `MAJLIS_API` is here because running a throwaway
       * copy of the server beside the one already on 4000 is the only way to
       * exercise a change without touching the record somebody is using.
       */
      '/api': {
        target: process.env.MAJLIS_API ?? 'http://localhost:4000',
        changeOrigin: true,
        /*
         * Who this window is signed in as, while the dev server is running.
         *
         * ── why this exists ────────────────────────────────────────────
         *
         * The server identifies a member by HTTP basic credentials. A
         * browser will answer that with its own dialog for a page it
         * navigates to, but not for a `fetch` — the request simply comes
         * back 401 and the screen looks broken rather than locked. And a
         * browser keeps one set of credentials per origin, so two roles
         * cannot be open beside each other at all.
         *
         * A demonstration is two windows: the bank puts a question and the
         * board answers it. `MAJLIS_AS=<member>:<password>` gives this dev
         * server one identity, so two of them on two ports are two people.
         * It is how the walk in docs/DEMO-RUNBOOK.md is run.
         *
         * ── and what it is not ─────────────────────────────────────────
         *
         * The dev server only. `vite build` does not read this file's
         * `server` block and nothing here reaches a built bundle, so no
         * installation can be signed in by it. The password is typed into
         * a shell, which means it belongs to a throwaway board and not to
         * anybody's real one — same rule as everywhere else here.
         */
        configure: (proxy) => {
          const as = process.env.MAJLIS_AS;
          if (!as || !as.includes(':')) return;
          const header = 'Basic ' + Buffer.from(as).toString('base64');
          proxy.on('proxyReq', (r) => r.setHeader('authorization', header));
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
