---
'@shrinktofit/eslint-config': patch
---

Add a type-aware rule that removes redundant `void` operators from standalone Promise chains with explicit rejection handlers, supports opt-in structural Thenable checking through `checkThenables`, and enables native Promise checking in the recommended type-aware config.

Align the existing custom TypeScript rule options with the scope used by the upstream type-aware configs. The options now apply wherever consumers provide TypeScript parser services, including typed JavaScript and Vue SFC script blocks. Consumers may therefore see changed diagnostics outside physical TypeScript files for array style, declared namespaces, and intentionally ignored variables whose names begin with `_`.
