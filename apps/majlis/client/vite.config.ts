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
