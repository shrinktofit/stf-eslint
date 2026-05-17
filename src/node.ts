import node from 'eslint-plugin-n';
import { defineConfig } from 'eslint/config';

export default {
  configs: {
    recommended: defineConfig([
      node.configs['flat/recommended-module'],
      {
        rules: {
          'n/no-missing-import': 'off',
          'n/prefer-node-protocol': 'error',
          'n/prefer-global/buffer': ['error', 'never'],
          'n/prefer-global/process': ['error', 'never'],
        },
      },
    ]),
  },
};
