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
  treeshake: true,
  splitting: false,

  // Critical: externalize official packages, provided by the runner
  external: ['@actions/*'],

  // Bundle all other dependencies (like ali-oss) since node_modules is ignored
  noExternal: [/(.*)/],

  // Output .mjs (explicitly recommended)
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
