import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the app from the repository subpath; Vercel previews use the domain root.
  base: process.env.VERCEL ? '/' : '/Hockey-Manager-Playtest/',
  build: { outDir: 'dist', emptyOutDir: true }
});
