import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const isCdnBuild = mode === 'cdn';

  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'Mail818',
        formats: isCdnBuild ? ['iife'] : ['es', 'umd', 'iife'],
        fileName: (format) => {
          if (isCdnBuild) {
            // CDN build outputs
            return `cdn/mail818${format === 'iife' ? '.min' : ''}.js`;
          }

          // Regular build outputs
          if (format === 'es') return 'mail818.esm.js';
          if (format === 'umd') return 'mail818.umd.js';
          return 'mail818.min.js';
        }
      },
      rollupOptions: {
        external: [],
        output: {
          globals: {},
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') {
              return isCdnBuild ? 'cdn/mail818.min.css' : 'mail818.min.css';
            }
            return assetInfo.name;
          }
        }
      },
      outDir: 'dist',
      emptyOutDir: false, // Never empty to preserve cdn folder
      minify: 'terser',
      sourcemap: true,
      cssCodeSplit: false
    }
  };
});