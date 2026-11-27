import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Reachable from other devices on your Wi-Fi (e.g. testing on a phone at http://<this PC's IP>:5173).
    // Set back to '127.0.0.1' to make it this-computer-only again. The API stays local; the phone reaches it through /api.
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:4000',
      '/socket.io': { target: 'http://127.0.0.1:4000', ws: true },
    },
  },
  // Use the shared package's TypeScript source directly, so changes to it show up
  // immediately (no stale pre-bundled copy, no CommonJS conversion).
  resolve: {
    alias: {
      '@kestrel/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
});
