import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  define: {
    // Production environment variables - these get replaced at build time
    'import.meta.env.VITE_CDN_BASE': JSON.stringify('https://cdn.mail818.com'),
    'import.meta.env.VITE_API_BASE': JSON.stringify('https://api.mail818.com'),
    'import.meta.env.VITE_SDK_VERSION': JSON.stringify('latest'),
    'import.meta.env.VITE_SDK_PATH': JSON.stringify('/')
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/loader.js'),
      name: 'Mail818Loader',
      formats: ['iife'],
      fileName: () => 'collect.js'
    },
    rollupOptions: {
      external: [],
      output: {
        // No globals needed for IIFE
        globals: {}
      }
    },
    outDir: 'dist/cdn',
    emptyOutDir: false, // Don't empty since we have other files
    minify: 'terser',
    sourcemap: false, // No sourcemap for the loader
    // Optimize for small size
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
        pure_funcs: []
      },
      mangle: true,
      format: {
        comments: false
      }
    }
  }
});