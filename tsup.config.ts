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

  // Critical: externalize official packages provided by the runner
  // Also externalize Node.js built-in modules to avoid dynamic require issues in ESM
  external: [
    '@actions/*',
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

  // Don't use noExternal - let external list take precedence
  // All dependencies (like ali-oss) will be bundled except those in external list

  // Shim for modules that might use dynamic require (may not be needed with proper externalization)
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
