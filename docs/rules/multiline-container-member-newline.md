# multiline-container-member-newline

Require members of a multiline container to start on separate lines. A container
whose opening and closing delimiters share a line is left unchanged.

The rule checks object literals, arrays, destructuring patterns, TypeScript type
literals, interfaces, enums, and tuples. Named imports and exports can also be
checked through options. It does not choose when a container must
expand; the existing bracket and brace rules make that decision.

## Incorrect

```ts
const options = {
  host: 'localhost', port: 8080,
};

type Options = {
  host: string; port: number;
};
```

## Correct

```ts
const options = { host: 'localhost', port: 8080 };

const expandedOptions = {
  host: 'localhost',
  port: 8080,
};

type Options = {
  host: string;
  port: number;
};
```

## Options

```js
{
  ImportDeclaration: true,
  ExportDeclaration: true,
}
```

Both options default to `false` when using the rule directly. The recommended
configuration enables both. Each option controls checking named specifiers inside
multiline braces, including type-only imports and exports and re-exports. Default
imports and namespace specifiers are excluded. Only the brace range determines
whether the list is multiline; line breaks elsewhere in the statement do not.

With these options enabled:

```ts
// Incorrect
import {
  foo, bar,
} from 'pkg';

export {
  foo, bar,
} from 'pkg';

// Correct
import { foo, bar } from 'pkg';

export {
  foo,
  bar,
} from 'pkg';
```

`eslint --fix` inserts line breaks without removing comments, separators, or array
holes. Indentation is handled by the configured indentation rule.
