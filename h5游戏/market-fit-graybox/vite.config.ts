import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    restoreMocks: true,
    include: ['test/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
});
