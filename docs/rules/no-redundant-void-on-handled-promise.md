# `@shrinktofit/no-redundant-void-on-handled-promise`

Disallows a redundant `void` operator when a standalone Promise expression already ends in an explicit rejection handler. Structural Thenables can be included with the `checkThenables` option.

The rule requires TypeScript type information. It reports only when all of the following are true:

- the `void` expression is an `ExpressionStatement`;
- the receiver is definitely a native Promise, a Promise-derived type, or an enabled structural Thenable;
- the terminal operation is `catch(handler)` or `then(onFulfilled, onRejected)`; and
- the rejection handler is definitely callable and is not `any`, `unknown`, `null`, or `undefined`.

The rule is enabled as an error by `stf.configs.recommended` wherever the consumer provides TypeScript parser services. This includes Vue SFC script blocks when `vue-eslint-parser` delegates them to `@typescript-eslint/parser`. Existing consumers of that preset may receive new diagnostics for handled native Promise statements that retain a leading `void`. Structural Thenables are not included by the preset's default configuration. The safe autofix removes only the redundant operator and preserves comments.

## Options

### `checkThenables`

`false` by default. When enabled, the rule also checks `PromiseLike` values and custom structural Thenables whose `then` method accepts fulfillment and rejection callbacks.

```js
{
  rules: {
    '@shrinktofit/no-redundant-void-on-handled-promise': [
      'error',
      { checkThenables: true },
    ],
  },
}
```

## Incorrect

```ts
void promise.catch(handleError);
void createPromise().catch(handleError);
void promise.then(onFulfilled, onRejected);
```

## Correct

```ts
promise.catch(handleError);
void promise;
void promise.then(onFulfilled);
return void promise.catch(handleError);
const result = void promise.catch(handleError);
void nonPromise.catch(handleError);
void promise.catch(undefined);
void promise.catch(handleError).finally(cleanup);
```
