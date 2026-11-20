import { defineConfig } from 'vite';

declare const process: { env: Record<string, string | undefined> };

const previewHost = process.env.PREVIEW_HOST;

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: previewHost ? [previewHost] : undefined,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1400,
  },
});
