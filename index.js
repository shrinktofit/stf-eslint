// @ts-check

import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';

const recommended = defineConfig([
  eslint.configs.recommended,
  tsEslint.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    semi: true,
    commaDangle: 'always-multiline',
    braceStyle: '1tbs',
    arrowParens: true,
  }),
  {
    rules: {
      eqeqeq: ['error', 'always'],
    },
  },
  {
    plugins: {
      unicorn,
    },
    rules: {
      'unicorn/no-typeof-undefined': 'error',
    },
  },
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/function-call-argument-newline': ['error', 'consistent'],
      '@stylistic/indent': ['error', 2, {
        SwitchCase: 0,
      }],
    },
  },
  {
    files: ['**/*{.ts,.tsx,.cts,.mts}'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-namespace': ['error', {
        allowDeclarations: true,
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
]);

export default {
  configs: {
    recommended,
  },
};
