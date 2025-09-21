// @ts-check

import vue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import tsEslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

const configs = {
  recommended: defineConfig([
    vue.configs['flat/recommended'],
    {
      files: ['**/*.vue'],
      languageOptions: {
        parser: vueParser,
        parserOptions: {
          extraFileExtensions: ['.vue'],
          sourceType: 'module',
          parser: {
            ts: tsEslint.parser,
          },
        },
      },
    },
  ]),
};

export default {
  configs,
};
