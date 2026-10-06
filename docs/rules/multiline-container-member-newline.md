# multiline-container-member-newline

Require members of a multiline container to start on separate lines. A container
whose opening and closing delimiters share a line is left unchanged.

The rule checks object literals, arrays, destructuring patterns, TypeScript type
literals, interfaces, enums, and tuples. It does not choose when a container must
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

The rule is enabled in the recommended configuration and accepts no options.
`eslint --fix` inserts line breaks without removing comments, separators, or array
holes. Indentation is handled by the configured indentation rule.
