import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { RuleTester } from 'eslint';
import tsEslint from 'typescript-eslint';
import stf from '../lib/index.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const filename = path.join(testDirectory, 'rule-test.ts');
const ruleName = 'no-redundant-void-on-handled-promise';
const ruleId = `@shrinktofit/${ruleName}`;
const noRedundantVoidOnHandledPromise = stf.rules[ruleName];

/// @case
/// Consumers load the rule and recommended preset through the package root export.
/// @expect
/// The public rule is the implementation enabled as an error in the type-aware preset layer.
void test('exports the rule and enables it in the recommended type-aware config', () => {
  const typeAwareRuleConfig = stf.configs.recommended.find((config) =>
    config.rules?.[ruleId] !== undefined);

  assert.ok(typeAwareRuleConfig);
  assert.equal(typeAwareRuleConfig.rules?.[ruleId], 'error');
  assert.equal(
    typeAwareRuleConfig.plugins?.['@shrinktofit'].rules?.[ruleName],
    noRedundantVoidOnHandledPromise,
  );
});

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsEslint.parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['rule-test.ts'],
      },
      tsconfigRootDir: testDirectory,
    },
  },
});

ruleTester.run(
  ruleName,
  noRedundantVoidOnHandledPromise,
  {
    valid: [
      /// @case
      /// A handled Promise statement has no leading void.
      /// @expect
      /// The rule leaves the already-canonical statement unchanged.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
promise.catch(handleError);
        `,
        filename,
      },
      /// @case
      /// Void marks a bare Promise as intentionally fire-and-forget.
      /// @expect
      /// The rule defers this unhandled Promise to no-floating-promises.
      {
        code: `
declare const promise: Promise<void>;
void promise;
        `,
        filename,
      },
      /// @case
      /// Then has no definite rejection handler.
      /// @expect
      /// The rule leaves both missing and undefined rejection handlers unchanged.
      {
        code: `
declare const promise: Promise<void>;
declare const onFulfilled: () => void;
void promise.then(onFulfilled);
void promise.then(onFulfilled, undefined);
        `,
        filename,
      },
      /// @case
      /// Void is used to force undefined from a return statement.
      /// @expect
      /// The value-bearing use of void is preserved.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
function discard(): undefined {
  return void promise.catch(handleError);
}
        `,
        filename,
      },
      /// @case
      /// Void is used to assign undefined.
      /// @expect
      /// The value-bearing use of void is preserved.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
const result = void promise.catch(handleError);
        `,
        filename,
      },
      /// @case
      /// Void supplies undefined as a call argument.
      /// @expect
      /// The value-bearing use of void is preserved.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
declare function consume(value: undefined): void;
consume(void promise.catch(handleError));
        `,
        filename,
      },
      /// @case
      /// A non-Thenable object exposes a method named catch.
      /// @expect
      /// A method name without Thenable type evidence is ignored.
      {
        code: `
declare const nonPromise: { catch(handler: (reason: unknown) => void): void };
declare const handleError: (reason: unknown) => void;
void nonPromise.catch(handleError);
        `,
        filename,
      },
      /// @case
      /// Catch receives no rejection handler.
      /// @expect
      /// The rule cannot prove rejection handling and emits nothing.
      {
        code: `
declare const promise: Promise<void>;
void promise.catch();
        `,
        filename,
      },
      /// @case
      /// Catch receives an explicitly nullish handler.
      /// @expect
      /// Undefined and null handlers are not treated as rejection handling.
      {
        code: `
declare const promise: Promise<void>;
void promise.catch(undefined);
void promise.catch(null);
        `,
        filename,
      },
      /// @case
      /// A handler may be undefined at runtime.
      /// @expect
      /// The rule rejects the union instead of assuming a callable value.
      {
        code: `
declare const promise: Promise<void>;
declare const handler: ((reason: unknown) => void) | undefined;
void promise.catch(handler);
        `,
        filename,
      },
      /// @case
      /// A structural Thenable accepts an unknown handler.
      /// @expect
      /// Unknown is insufficient proof that rejection is handled.
      {
        code: `
interface UnknownHandlerThenable extends PromiseLike<void> {
  catch(handler: unknown): PromiseLike<void>;
}
declare const thenable: UnknownHandlerThenable;
declare const handler: unknown;
void thenable.catch(handler);
        `,
        filename,
      },
      /// @case
      /// A structural Thenable has a callable rejection handler under default options.
      /// @expect
      /// Structural Thenables are not checked unless checkThenables is enabled.
      {
        code: `
interface HandledThenable extends PromiseLike<void> {
  catch(handler: (reason: unknown) => void): PromiseLike<void>;
}
declare const thenable: HandledThenable;
declare const handleError: (reason: unknown) => void;
void thenable.catch(handleError);
        `,
        filename,
      },
      /// @case
      /// A structural object has a fulfillment-only then method while checkThenables is enabled.
      /// @expect
      /// Without a callable rejection parameter, the object is not a checked Thenable.
      {
        code: `
interface FulfillmentOnlyThenable {
  then(onFulfilled: () => void): void;
  catch(handler: (reason: unknown) => void): void;
}
declare const thenable: FulfillmentOnlyThenable;
declare const handleError: (reason: unknown) => void;
void thenable.catch(handleError);
        `,
        filename,
        options: [{ checkThenables: true }],
      },
      /// @case
      /// A native Promise receives an any handler.
      /// @expect
      /// Any is insufficient proof that rejection is handled.
      {
        code: `
declare const promise: Promise<void>;
declare const handler: any;
void promise.catch(handler);
        `,
        filename,
      },
      /// @case
      /// An any receiver exposes an apparent catch method.
      /// @expect
      /// Any is insufficient proof that the receiver is Thenable.
      {
        code: `
declare const promise: any;
declare const handleError: (reason: unknown) => void;
void promise.catch(handleError);
        `,
        filename,
      },
      /// @case
      /// Catch receives a non-callable object.
      /// @expect
      /// A named method on the handler object is not mistaken for callability.
      {
        code: `
declare const promise: Promise<void>;
declare const handler: { handle(reason: unknown): void };
void promise.catch(handler);
        `,
        filename,
      },
      /// @case
      /// A handled Promise chain terminates in finally.
      /// @expect
      /// The terminal finally remains outside this rule because it can reject.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
declare const cleanup: () => void;
void promise.catch(handleError).finally(cleanup);
        `,
        filename,
      },
      /// @case
      /// A non-Thenable catch method happens to return a Promise.
      /// @expect
      /// The Promise return type does not substitute for a Thenable receiver.
      {
        code: `
declare const notPromise: {
  catch(handler: (reason: unknown) => void): Promise<void>;
};
declare const handleError: (reason: unknown) => void;
void notPromise.catch(handleError);
        `,
        filename,
      },
      /// @case
      /// A Thenable has an optional catch method that may not run.
      /// @expect
      /// Optional invocation is not treated as definite rejection handling.
      {
        code: `
interface OptionalCatchThenable extends PromiseLike<void> {
  catch?: (handler: (reason: unknown) => void) => PromiseLike<void>;
}
declare const thenable: OptionalCatchThenable;
declare const handleError: (reason: unknown) => void;
void thenable.catch?.(handleError);
        `,
        filename,
      },
      /// @case
      /// An optional chain calls a method whose own return type may be undefined.
      /// @expect
      /// The returned undefined is not mistaken for an optional-chain short circuit.
      {
        code: `
interface Holder {
  getPromise(): Promise<void> | undefined;
}
declare const holder: Holder | undefined;
declare const handleError: (reason: unknown) => void;
void holder?.getPromise().catch(handleError);
        `,
        filename,
      },
      /// @case
      /// A generic conditional return may select undefined at runtime.
      /// @expect
      /// The unresolved conditional is not treated as definitely present.
      {
        code: `
interface Holder {
  getPromise<T>(value: T): T extends string ? Promise<void> : undefined;
}
declare const holder: Holder | undefined;
declare const value: string | number;
declare const handleError: (reason: unknown) => void;
void holder?.getPromise(value).catch(handleError);
        `,
        filename,
      },
      /// @case
      /// A generic indexed-access return can select an undefined property.
      /// @expect
      /// The unresolved indexed access is not treated as definitely present.
      {
        code: `
interface Results {
  yes: Promise<void>;
  no: undefined;
}
interface Holder {
  getPromise<K extends keyof Results>(key: K): Results[K];
}
declare const holder: Holder | undefined;
declare const key: keyof Results;
declare const handleError: (reason: unknown) => void;
void holder?.getPromise(key).catch(handleError);
        `,
        filename,
      },
      /// @case
      /// The selected overload explicitly has a nullable Promise return.
      /// @expect
      /// An unrelated definite overload does not make this call safe.
      {
        code: `
interface Holder {
  getPromise(value: 'yes'): Promise<void>;
  getPromise(value: 'maybe'): Promise<void> | undefined;
}
declare const holder: Holder | undefined;
declare const handleError: (reason: unknown) => void;
void holder?.getPromise('maybe').catch(handleError);
        `,
        filename,
      },
      /// @case
      /// A callable union includes a branch with a nullable Promise return.
      /// @expect
      /// No constituent ordering can turn the synthesized signature into definite proof.
      {
        code: `
type DefiniteFactory = (kind: 'yes') => Promise<void>;
type NullableFactory = (kind: 'yes') => Promise<void> | undefined;
interface Holder {
  definiteFirst: DefiniteFactory | NullableFactory;
  nullableFirst: NullableFactory | DefiniteFactory;
}
declare const holder: Holder | undefined;
declare const handleError: (reason: unknown) => void;
void holder?.definiteFirst('yes').catch(handleError);
void holder?.nullableFirst('yes').catch(handleError);
        `,
        filename,
      },
    ],
    invalid: [
      /// @case
      /// A native Promise ends in catch with a definitely callable rejection handler.
      /// @expect
      /// The standalone void is reported and removed.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
void promise.catch(handleError);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
promise.catch(handleError);
        `,
      },
      /// @case
      /// A created Promise ends in catch with a definitely callable rejection handler.
      /// @expect
      /// The standalone void is reported and removed without changing the call chain.
      {
        code: `
declare function createPromise(): Promise<void>;
declare const handleError: (reason: unknown) => void;
void createPromise().catch(handleError);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
declare function createPromise(): Promise<void>;
declare const handleError: (reason: unknown) => void;
createPromise().catch(handleError);
        `,
      },
      /// @case
      /// A native Promise then call supplies both fulfillment and rejection handlers.
      /// @expect
      /// The standalone void is reported and removed.
      {
        code: `
declare const promise: Promise<void>;
declare const onFulfilled: () => void;
declare const onRejected: (reason: unknown) => void;
void promise.then(onFulfilled, onRejected);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
declare const promise: Promise<void>;
declare const onFulfilled: () => void;
declare const onRejected: (reason: unknown) => void;
promise.then(onFulfilled, onRejected);
        `,
      },
      /// @case
      /// A structural Thenable exposes catch and receives a callable handler with checkThenables enabled.
      /// @expect
      /// Type information proves the receiver is Thenable and the void is removed when opted in.
      {
        code: `
interface HandledThenable extends PromiseLike<void> {
  catch(handler: (reason: unknown) => void): PromiseLike<void>;
}
declare const thenable: HandledThenable;
declare const handleError: (reason: unknown) => void;
void thenable.catch(handleError);
        `,
        filename,
        options: [{ checkThenables: true }],
        errors: [{ messageId: 'redundantVoid' }],
        output: `
interface HandledThenable extends PromiseLike<void> {
  catch(handler: (reason: unknown) => void): PromiseLike<void>;
}
declare const thenable: HandledThenable;
declare const handleError: (reason: unknown) => void;
thenable.catch(handleError);
        `,
      },
      /// @case
      /// A custom structural Thenable has callable fulfillment and rejection parameters.
      /// @expect
      /// Enabling checkThenables includes the custom type and removes the redundant void.
      {
        code: `
interface CustomHandledThenable {
  then(
    onFulfilled: () => void,
    onRejected: (reason: unknown) => void,
  ): CustomHandledThenable;
  catch(handler: (reason: unknown) => void): CustomHandledThenable;
}
declare const thenable: CustomHandledThenable;
declare const handleError: (reason: unknown) => void;
void thenable.catch(handleError);
        `,
        filename,
        options: [{ checkThenables: true }],
        errors: [{ messageId: 'redundantVoid' }],
        output: `
interface CustomHandledThenable {
  then(
    onFulfilled: () => void,
    onRejected: (reason: unknown) => void,
  ): CustomHandledThenable;
  catch(handler: (reason: unknown) => void): CustomHandledThenable;
}
declare const thenable: CustomHandledThenable;
declare const handleError: (reason: unknown) => void;
thenable.catch(handleError);
        `,
      },
      /// @case
      /// TypeScript wrappers and optional chaining surround a handled Promise call.
      /// @expect
      /// The runtime call is recognized and only the standalone void is removed.
      {
        code: `
declare const promise: Promise<void> | undefined;
declare const handleError: (reason: unknown) => void;
void (promise?.catch(handleError) as Promise<void> | undefined);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
declare const promise: Promise<void> | undefined;
declare const handleError: (reason: unknown) => void;
(promise?.catch(handleError) as Promise<void> | undefined);
        `,
      },
      /// @case
      /// An earlier optional boundary short-circuits before a terminal catch call.
      /// @expect
      /// The nullable receiver branch is safe and the redundant void is removed.
      {
        code: `
declare const holder: { promise: Promise<void> } | undefined;
declare const handleError: (reason: unknown) => void;
void holder?.promise.catch(handleError);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
declare const holder: { promise: Promise<void> } | undefined;
declare const handleError: (reason: unknown) => void;
holder?.promise.catch(handleError);
        `,
      },
      /// @case
      /// An optional factory definitely returns a Promise before terminal catch.
      /// @expect
      /// Only the synthetic short-circuit undefined is removed from the receiver proof.
      {
        code: `
interface Holder {
  getPromise(): Promise<void>;
}
declare const holder: Holder | undefined;
declare const handleError: (reason: unknown) => void;
void holder?.getPromise().catch(handleError);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
interface Holder {
  getPromise(): Promise<void>;
}
declare const holder: Holder | undefined;
declare const handleError: (reason: unknown) => void;
holder?.getPromise().catch(handleError);
        `,
      },
      /// @case
      /// The selected overload definitely returns a Promise.
      /// @expect
      /// A nullable return on an unrelated overload does not suppress the diagnostic.
      {
        code: `
interface Holder {
  getPromise(value: 'yes'): Promise<void>;
  getPromise(value: 'maybe'): Promise<void> | undefined;
}
declare const holder: Holder | undefined;
declare const handleError: (reason: unknown) => void;
void holder?.getPromise('yes').catch(handleError);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
interface Holder {
  getPromise(value: 'yes'): Promise<void>;
  getPromise(value: 'maybe'): Promise<void> | undefined;
}
declare const holder: Holder | undefined;
declare const handleError: (reason: unknown) => void;
holder?.getPromise('yes').catch(handleError);
        `,
      },
      /// @case
      /// Handled optional chains contain intermediate Promise-returning calls.
      /// @expect
      /// Then and finally results remain proven Promises before terminal catch.
      {
        code: `
declare const holder: { promise: Promise<void> } | undefined;
declare const onFulfilled: () => void;
declare const cleanup: () => void;
declare const handleError: (reason: unknown) => void;
void holder?.promise.then(onFulfilled).catch(handleError);
void holder?.promise.finally(cleanup).catch(handleError);
        `,
        filename,
        errors: [
          { messageId: 'redundantVoid' },
          { messageId: 'redundantVoid' },
        ],
        output: `
declare const holder: { promise: Promise<void> } | undefined;
declare const onFulfilled: () => void;
declare const cleanup: () => void;
declare const handleError: (reason: unknown) => void;
holder?.promise.then(onFulfilled).catch(handleError);
holder?.promise.finally(cleanup).catch(handleError);
        `,
      },
      /// @case
      /// Optional invocation targets a required native Promise catch method.
      /// @expect
      /// The method type proves catch will run and the redundant void is removed.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
void promise.catch?.(handleError);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
promise.catch?.(handleError);
        `,
      },
      /// @case
      /// Control flow proves an optional Thenable catch property exists when checkThenables is enabled.
      /// @expect
      /// The narrowed method handles rejection and the redundant void is removed when opted in.
      {
        code: `
interface OptionalCatchThenable extends PromiseLike<void> {
  catch?: (handler: (reason: unknown) => void) => PromiseLike<void>;
}
declare const promise: OptionalCatchThenable;
declare const handleError: (reason: unknown) => void;
if (promise.catch) {
  void promise.catch(handleError);
}
        `,
        filename,
        options: [{ checkThenables: true }],
        errors: [{ messageId: 'redundantVoid' }],
        output: `
interface OptionalCatchThenable extends PromiseLike<void> {
  catch?: (handler: (reason: unknown) => void) => PromiseLike<void>;
}
declare const promise: OptionalCatchThenable;
declare const handleError: (reason: unknown) => void;
if (promise.catch) {
  promise.catch(handleError);
}
        `,
      },
      /// @case
      /// Control flow proves intermediate Promise and factory properties are present.
      /// @expect
      /// Flow-narrowed receiver and callee types retain definite handled-Promise proofs.
      {
        code: `
interface Holder {
  promise?: Promise<void>;
  getPromise?: () => Promise<void>;
}
declare const holder: Holder;
declare const handleError: (reason: unknown) => void;
if (holder.promise) {
  void holder.promise.catch(handleError);
}
if (holder.getPromise) {
  void holder.getPromise().catch(handleError);
}
        `,
        filename,
        errors: [
          { messageId: 'redundantVoid' },
          { messageId: 'redundantVoid' },
        ],
        output: `
interface Holder {
  promise?: Promise<void>;
  getPromise?: () => Promise<void>;
}
declare const holder: Holder;
declare const handleError: (reason: unknown) => void;
if (holder.promise) {
  holder.promise.catch(handleError);
}
if (holder.getPromise) {
  holder.getPromise().catch(handleError);
}
        `,
      },
      /// @case
      /// A comment separates void from a handled Promise operand.
      /// @expect
      /// Autofix removes void while preserving the comment verbatim.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
void /* keep this context */ promise.catch(handleError);
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
/* keep this context */ promise.catch(handleError);
        `,
      },
      /// @case
      /// A parenthesized handled Promise follows an unterminated expression statement.
      /// @expect
      /// The redundant void is reported without a fix that could change ASI parsing.
      {
        code: `
declare const promise: Promise<void>;
declare const handleError: (reason: unknown) => void;
declare function previousCall(): void;
previousCall()
void (promise.catch(handleError));
        `,
        filename,
        errors: [{ messageId: 'redundantVoid' }],
        output: null,
      },
    ],
  },
);
