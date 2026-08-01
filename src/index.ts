import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';

const recommended = defineConfig([
  eslint.configs.recommended,
  tsEslint.configs.recommendedTypeChecked,
  tsEslint.configs.stylisticTypeChecked,
  stylistic.configs.customize({
    indent: 2,
    semi: true,
    commaDangle: 'always-multiline',
    braceStyle: '1tbs',
    arrowParens: true,
  }),
  {
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-unary-minus': 'off',
      'eqeqeq': ['error', 'always'],
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

const classMemberOrder = [
  'public-static-field',
  [
    'public-static-accessor',
    'public-static-get',
    'public-static-set',
  ],
  'public-static-method',

  'public-constructor',

  [
    'signature',
    'public-instance-field',
    'public-abstract-field',
  ],
  [
    'public-instance-accessor',
    'public-instance-get',
    'public-instance-set',
    'public-abstract-accessor',
    'public-abstract-get',
    'public-abstract-set',
  ],
  [
    'public-instance-method',
    'public-abstract-method',
  ],

  'protected-static-field',
  [
    'protected-static-accessor',
    'protected-static-get',
    'protected-static-set',
  ],
  'protected-static-method',

  'protected-constructor',

  [
    'protected-instance-field',
    'protected-abstract-field',
  ],
  [
    'protected-instance-accessor',
    'protected-instance-get',
    'protected-instance-set',
    'protected-abstract-accessor',
    'protected-abstract-get',
    'protected-abstract-set',
  ],
  [
    'protected-instance-method',
    'protected-abstract-method',
  ],

  [
    'private-static-field',
    '#private-static-field',
  ],
  [
    'private-static-accessor',
    'private-static-get',
    'private-static-set',
    '#private-static-accessor',
    '#private-static-get',
    '#private-static-set',
  ],
  [
    'private-static-method',
    '#private-static-method',
  ],

  'private-constructor',

  [
    'private-instance-field',
    '#private-instance-field',
  ],
  [
    'private-instance-accessor',
    'private-instance-get',
    'private-instance-set',
    '#private-instance-accessor',
    '#private-instance-get',
    '#private-instance-set',
  ],
  [
    'private-instance-method',
    '#private-instance-method',
  ],

  'static-initialization',
];

const conventions = defineConfig([
  {
    rules: {
      '@typescript-eslint/explicit-member-accessibility': ['error', {
        accessibility: 'no-public',
      }],
      '@typescript-eslint/member-ordering': ['error', {
        default: 'never',
        classes: classMemberOrder,
        classExpressions: classMemberOrder,
      }],
      '@typescript-eslint/naming-convention': ['error',
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['camelCase'],
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
      ],
    },
  },
]);

export default {
  configs: {
    recommended,
    conventions,
  },
};
