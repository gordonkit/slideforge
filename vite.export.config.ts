import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/exporters',
    emptyOutDir: false,
    lib: {
      entry: 'src/exporters/browser.ts',
      name: 'SlideForgeEngine',
      formats: ['iife'],
      fileName: () => 'engine.js',
    },
  },
});
