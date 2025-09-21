// @ts-check

import node from 'eslint-plugin-n';

const configs = {
  recommended: [
    node.configs['flat/recommended-module'],
    {
      rules: {
        'n/no-missing-import': 'off',
        'n/prefer-node-protocol': 'error',
        'n/prefer-global/buffer': ['error', 'never'],
        'n/prefer-global/process': ['error', 'never'],
      },
    },
  ],
};

export default {
  configs,
};
