import { defineConfig } from 'eslint/config';
import stf from './index.js';

export default defineConfig([
  {
    extends: [stf.configs.recommended],
  },
]);
