import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tsEslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';
import stf from '../lib/index.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const ruleId = '@shrinktofit/no-redundant-void-on-handled-promise';

/// @case
/// A consumer combines the recommended preset with Vue's TypeScript parser delegation.
/// @expect
/// Custom TypeScript rules and options apply inside the Vue script block.
void test('recommended applies TypeScript rules to type-aware Vue files', async () => {
  const vueFilename = path.join(testDirectory, 'rule-test.vue');
  const eslint = new ESLint({
    cwd: testDirectory,
    overrideConfigFile: true,
    overrideConfig: [
      ...stf.configs.recommended,
      {
        languageOptions: {
          parserOptions: {
            projectService: {
              allowDefaultProject: ['rule-test.vue'],
            },
            tsconfigRootDir: testDirectory,
          },
        },
      },
      {
        files: ['**/*.vue'],
        languageOptions: {
          parser: vueParser,
          parserOptions: {
            extraFileExtensions: ['.vue'],
            parser: tsEslint.parser,
          },
        },
      },
    ],
  });
  const [result] = await eslint.lintText(`
<script lang="ts">
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
export declare namespace PublicTypes {
  type Value = string;
}
const _ignored: Array<string> = [];
Promise.resolve();
void promise.catch(handleError);
</script>
  `, {
    filePath: vueFilename,
  });
  const diagnosticsByRule = Object.groupBy(
    result.messages,
    (message) => message.ruleId ?? 'fatal',
  );

  assert.equal(
    diagnosticsByRule[ruleId]?.length,
    1,
    JSON.stringify(result.messages, undefined, 2),
  );
  assert.equal(diagnosticsByRule[ruleId]?.[0].messageId, 'redundantVoid');
  assert.equal(diagnosticsByRule['@typescript-eslint/array-type']?.length, 1);
  assert.equal(diagnosticsByRule['@typescript-eslint/no-floating-promises']?.length, 1);
  assert.equal(diagnosticsByRule['@typescript-eslint/no-namespace'], undefined);
  assert.equal(diagnosticsByRule['@typescript-eslint/no-unused-vars'], undefined);
  assert.equal(diagnosticsByRule.fatal, undefined);
});
