// @ts-check

import { defineConfig, globalIgnores } from 'eslint/config';
import stf from './lib/index.js';

export default defineConfig([
  globalIgnores([
    'lib',
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
            'tests/*.test.js',
          ],
        },
      },
    },
  },
  {
    extends: [
      stf.configs.recommended,
      stf.configs.conventions,
    ],
  },
]);
