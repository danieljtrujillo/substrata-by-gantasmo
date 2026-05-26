import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode: _mode}) => {
  // Note: GEMINI_API_KEY is intentionally NOT defined here. All Gemini calls
  // proxy through /api/ai/relay (functions/api/ai/relay.ts) so the key
  // never enters the browser bundle. See security_spec.md §"AI key handling".
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
