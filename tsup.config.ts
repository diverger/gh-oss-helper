import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node20',
  platform: 'node',
  sourcemap: true,
  minify: true,
  clean: true,
  bundle: true,
  noExternal: [/(.*)/], // Bundle all dependencies
  external: ['proxy-agent'],
  dts: true,
  treeshake: true,
  splitting: false,
  shims: true, // Add shim for __dirname, __filename, etc.
  outExtension() {
    return {
      js: '.mjs',
    };
  },
});
