import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/cdn',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/loader.js'),
      formats: ['iife'],
      name: 'Mail818Loader',
      fileName: () => 'collect.js'
    },
    minify: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  define: {
    // Development environment variables - these replace import.meta.env in the code
    'import.meta.env.VITE_CDN_BASE': JSON.stringify(''), // empty string for local
    'import.meta.env.VITE_API_BASE': JSON.stringify('http://localhost:8787'),
    'import.meta.env.VITE_SDK_VERSION': JSON.stringify('dist'),
    'import.meta.env.VITE_SDK_PATH': JSON.stringify('/')
  }
});