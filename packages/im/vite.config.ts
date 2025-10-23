import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 9527
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
