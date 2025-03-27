import { type RolldownPlugin, defineConfig } from 'rolldown';
import pkg from './package.json';

import typescript from '@rollup/plugin-typescript';

export default defineConfig({
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.js', format: 'esm' },
    { file: 'dist/index.cjs', format: 'cjs' },
  ],
  external: Object.keys(pkg.dependencies),
  plugins: [
    typescript({
      rootDir: './src',
      exclude: ['**/*.test.ts'],
    }) as RolldownPlugin,
  ],
});
