import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import stf from '../lib/index.js';

const options = {
  overrideConfigFile: true,
  overrideConfig: [
    ...stf.configs.recommended,
    {
      languageOptions: {
        parserOptions: {
          projectService: {
            allowDefaultProject: ['container-test.ts'],
          },
          tsconfigRootDir: import.meta.dirname,
        },
      },
    },
  ],
};
const eslint = new ESLint(options);
const fixingEslint = new ESLint({ ...options, fix: true });
const filePath = `${import.meta.dirname}/container-test.ts`;

void test('recommended preserves inline and multiline containers below four members', async () => {
  /// @case
  /// Arrays and objects with zero through three members use either inline or multiline layout.
  /// @expect
  /// Both layouts pass lint and automatic fixes leave their text unchanged.
  for (let count = 0; count < 4; count++) {
    const values = Array.from({ length: count }, (_, index) => String(index + 1));
    const properties = values.map((value) => `p${value}: ${value}`);
    for (const { opening, closing, members } of [
      { opening: '[', closing: ']', members: values },
      { opening: '{', closing: '}', members: properties },
    ]) {
      const inline = opening === '{' && count > 0
        ? `{ ${members.join(', ')} }`
        : `${opening}${members.join(', ')}${closing}`;
      const multiline = `${opening}\n${members.map((member) => `  ${member},\n`).join('')}${closing}`;
      for (const container of [inline, multiline]) {
        const code = `export const values = ${container};\n`;
        const [result] = await eslint.lintText(code, { filePath });
        assert.equal(result.errorCount, 0, JSON.stringify({ code, messages: result.messages }));
        const [fixed] = await fixingEslint.lintText(code, { filePath });
        assert.equal(fixed.output ?? code, code);
      }
    }
  }
});

void test('recommended expands arrays and objects with four or more members', async () => {
  /// @case
  /// Inline arrays and objects contain four or five members.
  /// @expect
  /// Lint requires multiline layout, fixes put one member per line, and another fix is stable.
  for (const count of [4, 5]) {
    const values = Array.from({ length: count }, (_, index) => String(index + 1));
    const properties = values.map((value) => `p${value}: ${value}`);
    for (const { opening, closing, members } of [
      { opening: '[', closing: ']', members: values },
      { opening: '{', closing: '}', members: properties },
    ]) {
      const code = `export const values = ${opening}${members.join(', ')}${closing};\n`;
      const expected = `export const values = ${opening}\n`
        + members.map((member) => `  ${member},\n`).join('') + `${closing};\n`;
      const [result] = await eslint.lintText(code, { filePath });
      assert.ok(result.errorCount > 0);
      const [fixed] = await fixingEslint.lintText(code, { filePath });
      assert.equal(fixed.errorCount, 0, JSON.stringify(fixed.messages));
      assert.equal(fixed.output, expected);
      const [repeated] = await fixingEslint.lintText(expected, { filePath });
      assert.equal(repeated.output ?? expected, expected);
    }
  }
});

void test('recommended preserves comments and holes when expanding a four-slot array', async () => {
  /// @case
  /// A four-slot array has an empty slot and comments attached to its remaining elements.
  /// @expect
  /// Automatic fixes preserve every slot and comment while expanding the array.
  const code = 'export const values = [1, , /* second value */ 2, 3 /* last */];\n';
  const [result] = await fixingEslint.lintText(code, { filePath });
  assert.deepEqual(result.messages.map((message) => message.ruleId), ['no-sparse-arrays']);
  assert.ok(result.output.includes('/* second value */'));
  assert.ok(result.output.includes('/* last */'));
  assert.equal(
    result.output.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s/g, '').replace(/,\]/g, ']'),
    code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s/g, ''),
  );
});

void test('recommended keeps short outer containers around multiline values', async () => {
  /// @case
  /// A short array or object has a multiline child with its own delimiters beside that child.
  /// @expect
  /// The child's layout does not force the short outer container to expand its delimiters.
  for (const code of [
    'export const values = [{\n  a: 1,\n  b: 2,\n  c: 3,\n  d: 4,\n}];\n',
    'export const values = { data: [\n  1,\n] };\n',
  ]) {
    const [result] = await fixingEslint.lintText(code, { filePath });
    assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
    const fixed = result.output ?? code;
    assert.equal(fixed.split('\n')[0], code.split('\n')[0]);
    assert.equal(fixed.trim().split('\n').at(-1), code.trim().split('\n').at(-1));
  }
});

void test('recommended applies the threshold to destructuring and type literals', async () => {
  /// @case
  /// Destructuring patterns, tuple types, and object type literals contain three or four members.
  /// @expect
  /// Three members stay inline; four expand, including an array pattern with a type annotation.
  for (const code of [
    'export const [a, b, c] = [1, 2, 3];\n',
    'export const { a, b, c } = { a: 1, b: 2, c: 3 };\n',
    'export type Values = [number, string, boolean];\n',
    'export type Values = { a: number; b: number; c: number } | undefined;\n',
  ]) {
    const [result] = await fixingEslint.lintText(code, { filePath });
    assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
    assert.equal(result.output ?? code, code);
  }
  for (const code of [
    'export const [a, b, c, d]: number[] = [1, 2, 3, 4];\n',
    'export const { a, b, c, d } = { a: 1, b: 2, c: 3, d: 4 };\n',
    'export type Values = [number, string, boolean, unknown];\n',
    'export type Values = { a: number; b: number; c: number; d: number } | undefined;\n',
  ]) {
    const [result] = await fixingEslint.lintText(code, { filePath });
    assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
    assert.ok(result.output.split('\n').length > 4);
    if (code.startsWith('export const {')) {
      assert.ok(result.output.startsWith('export const {\n'));
      assert.ok(result.output.includes('\n} = {\n'));
    }
    if (code.includes(': number[]')) {
      assert.ok(result.output.startsWith('export const [\n'));
      assert.ok(result.output.includes('\n]: number[]'));
    }
  }
});

void test('recommended retains named import and export member checks', async () => {
  /// @case
  /// Named imports, type-only imports, and re-exports use inline or multiline braces.
  /// @expect
  /// Inline braces remain allowed; multiline braces require each named member on its own line.
  for (const code of [
    'import { foo, bar } from \'pkg\';\nexport { foo, bar };\n',
    'import type { Foo, Bar } from \'pkg\';\nexport type { Foo, Bar };\n',
    'export { foo, bar } from \'pkg\';\n',
    'import { foo, bar, baz, qux } from \'pkg\';\nexport { foo, bar, baz, qux };\n',
  ]) {
    const [result] = await fixingEslint.lintText(code, { filePath });
    assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
    assert.equal(result.output ?? code, code);
  }
  for (const code of [
    'import {\n  foo, bar,\n} from \'pkg\';\nexport { foo, bar };\n',
    'import type {\n  Foo, Bar,\n} from \'pkg\';\nexport type { Foo, Bar };\n',
    'export {\n  foo, bar,\n} from \'pkg\';\n',
  ]) {
    const [result] = await eslint.lintText(code, { filePath });
    assert.ok(result.messages.some((message) =>
      message.ruleId === '@shrinktofit/multiline-container-member-newline'));
    const [fixed] = await fixingEslint.lintText(code, { filePath });
    assert.equal(fixed.errorCount, 0, JSON.stringify(fixed.messages));
    assert.ok(!fixed.output.includes('foo, bar,') && !fixed.output.includes('Foo, Bar,'));
  }
});

void test('recommended fixes nested arrays without requiring another lint run', async () => {
  /// @case
  /// Eight nested arrays each contain four members.
  /// @expect
  /// A single automatic fix finishes all layout changes and another run leaves the text unchanged.
  let array = '1';
  for (let level = 0; level < 8; level++) {
    array = `[${array}, 2, 3, 4]`;
  }
  const code = `export const values = ${array};\n`;
  const [result] = await fixingEslint.lintText(code, { filePath });
  assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
  const fixed = result.output ?? code;
  const [repeated] = await fixingEslint.lintText(fixed, { filePath });
  assert.equal(repeated.output ?? fixed, fixed);
});

void test('recommended preserves CRLF line endings when expanding an array', async () => {
  /// @case
  /// A Windows source file contains an inline four-member array.
  /// @expect
  /// Array bracket and member fixes preserve CRLF without introducing bare LF line endings.
  const code = 'export const values = [1, 2, 3, 4];\r\n';
  const [result] = await fixingEslint.lintText(code, { filePath });
  assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
  assert.equal(result.output, 'export const values = [\r\n  1,\r\n  2,\r\n  3,\r\n  4,\r\n];\r\n');
});
