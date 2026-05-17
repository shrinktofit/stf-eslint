// @ts-check

import { defineConfig, globalIgnores } from 'eslint/config';
import stf from './lib/index.js';

export default defineConfig([
  globalIgnores([
    'node_modules',
    'packages/**/lib',
  ]),
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: {
          allowDefaultProject: [
            'eslint.config.js',
          ],
        },
      },
    },
  },
  {
    extends: [stf.configs.recommended],
  },
]);
