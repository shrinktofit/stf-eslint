import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import stf from '../lib/index.js';

const ruleId = '@stylistic/curly-newline';
const options = {
  overrideConfigFile: true,
  overrideConfig: [
    ...stf.configs.recommended,
    {
      languageOptions: {
        parserOptions: {
          projectService: {
            allowDefaultProject: ['block-test.ts'],
          },
          tsconfigRootDir: import.meta.dirname,
        },
      },
    },
  ],
};
const eslint = new ESLint(options);
const fixingEslint = new ESLint({ ...options, fix: true });
const filePath = `${import.meta.dirname}/block-test.ts`;

void test('recommended preserves empty blocks on one line', async () => {
  /// @case
  /// Empty constructors, callbacks, functions, methods, classes, and static blocks use {}.
  /// @expect
  /// The recommended preset accepts their brace layout and fixes leave it unchanged.
  for (const code of [
    'export class Box {\n  constructor(public value: number) {}\n}\n',
    'export const add = () => {};\n',
    'export class MatchSession {}\n',
    'export function noop() {}\n',
    'export class Hooks {\n  onLoad() {}\n}\n',
    'export class Cache {\n  static {}\n}\n',
  ]) {
    const [result] = await eslint.lintText(code, { filePath });
    assert.deepEqual(result.messages.filter((message) => message.ruleId === ruleId), []);
    const [fixed] = await fixingEslint.lintText(code, { filePath });
    assert.equal(fixed.output ?? code, code);
  }
});

void test('recommended collapses empty blocks and expands nonempty blocks', async () => {
  /// @case
  /// An empty callback was expanded by a previous fix, while another callback has one statement.
  /// @expect
  /// Fixes collapse the empty body, expand the nonempty body, and remain stable on another run.
  for (const { code, expected } of [
    {
      code: 'export const add = () => {\n};\n',
      expected: 'export const add = () => {};\n',
    },
    {
      code: 'export const answer = () => { return 42; };\n',
      expected: 'export const answer = () => {\n  return 42;\n};\n',
    },
  ]) {
    const [result] = await eslint.lintText(code, { filePath });
    assert.equal(
      result.messages.some((message) => message.ruleId === ruleId),
      code !== expected,
    );
    const [fixed] = await fixingEslint.lintText(code, { filePath });
    assert.equal(fixed.output ?? code, expected);
    assert.deepEqual(fixed.messages.filter((message) => message.ruleId === ruleId), []);
    const [repeated] = await fixingEslint.lintText(expected, { filePath });
    assert.equal(repeated.output ?? expected, expected);
  }
});
