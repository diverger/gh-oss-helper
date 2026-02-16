import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node24',
  platform: 'node',
  sourcemap: true,
  minify: true,
  clean: true,
  bundle: true,
  treeshake: true,
  splitting: false,
  shims: true,
  outExtension() {
    return {
      js: '.mjs',
    };
  },
});
