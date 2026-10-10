# multiline-container-member-newline

Require members of a multiline container to start on separate lines. Inline
containers are left unchanged unless an array meets the configured `minItems` threshold.

The rule checks object literals, arrays, destructuring patterns, TypeScript type
literals, interfaces, enums, and tuples. Named imports and exports can also be
checked through options. With `minItems`, arrays, array patterns, and tuple types
at or above the threshold expand their brackets. Smaller arrays keep their chosen
layout. The existing brace rule controls when objects expand.

The recommended configuration uses a four-member threshold for arrays, objects,
destructuring patterns, object type literals, and tuple types. Below four members,
both inline and multiline layouts are allowed. Multiline containers still require
one member per line. Interface and enum bodies retain their existing multiline style.

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
  minItems: 4,
}
```

The import/export options default to `false` when using the rule directly, and
`minItems` is unset. The recommended configuration enables both options and sets
`minItems` to `4`; the threshold counts array slots, including holes. Each boolean
option controls checking named specifiers inside
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
