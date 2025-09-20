import { defineConfig } from 'tsup'

export default defineConfig([
  // Modern ESM build
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'es2020',
    external: [],
    noExternal: ['ulid'],
    platform: 'neutral',
    outExtension: () => ({ js: '.mjs' })
  },
  // CommonJS build for Node.js
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: false,
    target: 'node16',
    external: [],
    noExternal: ['ulid'],
    platform: 'node',
    outExtension: () => ({ js: '.js' })
  },
  // UMD build for browser script tags
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: true,
    target: 'es2015',
    external: [],
    noExternal: ['ulid'],
    globalName: 'Mail818',
    platform: 'browser',
    outExtension: () => ({ js: '.umd.js' })
  },
  // Minified ESM for CDNs
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: true,
    target: 'es2015',
    external: [],
    noExternal: ['ulid'],
    platform: 'browser',
    outExtension: () => ({ js: '.min.js' })
  }
])