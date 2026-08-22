# @shrinktofit/eslint-config

## 0.0.12

### Patch Changes

- 708c7dc: Require ESLint 10 and document the Node.js runtime range already required by the bundled ESLint 10 toolchain.

## 0.0.11

### Patch Changes

- 797e801: Add a type-aware rule that removes redundant `void` operators from standalone Promise chains with explicit rejection handlers, supports opt-in structural Thenable checking through `checkThenables`, and enables native Promise checking in the recommended type-aware config.

  Align the existing custom TypeScript rule options with the scope used by the upstream type-aware configs. The options now apply wherever consumers provide TypeScript parser services, including typed JavaScript and Vue SFC script blocks. Consumers may therefore see changed diagnostics outside physical TypeScript files for array style, declared namespaces, and intentionally ignored variables whose names begin with `_`.

## 0.0.10

### Patch Changes

- 934401c: Configure `@typescript-eslint/array-type` to use the `array-simple` style in the recommended config.
