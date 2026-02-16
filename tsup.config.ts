import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  sourcemap: true,
  minify: true,
  clean: true,
  outExtension() {
    return {
      js: '.mjs',
    };
  },
});
