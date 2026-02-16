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

  // Externalize only Node.js built-in modules to avoid dynamic require issues in ESM
  external: [
    'node:*',
    'net',
    'tls',
    'http',
    'https',
    'stream',
    'assert',
    'util',
    'events',
    'url',
    'zlib',
    'crypto',
    'os',
    'fs',
    'path',
    'buffer',
    'querystring',
    'string_decoder',
  ],

  // Force bundle all npm packages including @actions/*
  // GitHub Actions runners don't provide these as ES modules
  noExternal: [/.*/],

  // Banner for potential dynamic require compatibility
  banner: {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
  },

  // Output .mjs (explicitly recommended)
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
