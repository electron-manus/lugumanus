import { type RolldownPlugin, defineConfig } from 'rolldown';
import pkg from './package.json';

import typescript from '@rollup/plugin-typescript';

export default defineConfig({
  input: {
    index: 'src/index.ts',
    'shrink-html': 'src/shrink-html.ts',
  },
  output: [
    {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].js',
      chunkFileNames: '[name].js',
    },
    {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name].cjs',
    },
  ],
  external: Object.keys(pkg.dependencies),
  plugins: [
    typescript({
      rootDir: './src',
      exclude: ['**/*.test.ts'],
    }) as RolldownPlugin,
  ],
});
