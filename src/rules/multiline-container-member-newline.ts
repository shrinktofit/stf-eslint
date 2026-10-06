import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

export interface MultilineContainerMemberNewlineOptions {
  ImportDeclaration?: boolean;
  ExportDeclaration?: boolean;
}

type Options = [MultilineContainerMemberNewlineOptions];

const multilineContainerMemberNewline = ESLintUtils.RuleCreator(
  (name) => `https://github.com/shrinktofit/stf-eslint/blob/main/docs/rules/${name}.md`,
)<Options, 'memberOnNewline'>({
  name: 'multiline-container-member-newline',
  meta: {
    type: 'layout',
    docs: {
      description: 'Require separate lines for members of multiline objects and arrays',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          ImportDeclaration: { type: 'boolean' },
          ExportDeclaration: { type: 'boolean' },
        },
      },
    ],
    messages: {
      memberOnNewline: 'Each member of a multiline container must start on a separate line.',
    },
  },
  defaultOptions: [{ ImportDeclaration: false, ExportDeclaration: false }],
  create(context, [options]) {
    const sourceCode = context.sourceCode;
    const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';

    function checkMembers(
      node: TSESTree.Node,
      members: ReadonlyArray<TSESTree.Node | null>,
      isArray = false,
    ): void {
      if (node.loc.start.line === node.loc.end.line) {
        return;
      }

      let previousMember: TSESTree.Node | undefined;
      for (const member of members) {
        if (member === null) {
          continue;
        }
        if (previousMember === undefined) {
          previousMember = member;
          continue;
        }

        let previousToken = sourceCode.getLastToken(previousMember)!;
        let currentToken = sourceCode.getFirstToken(member)!;
        if (isArray) {
          const separators = sourceCode.getTokensBetween(previousMember, member)
            .filter((token) => token.value === ',');
          const separator = separators.at(-1)!;
          previousToken = sourceCode.getTokenBefore(separator)!;
          currentToken = sourceCode.getTokenAfter(separator)!;
        }

        if (previousToken.loc.end.line === currentToken.loc.start.line) {
          const tokenBeforeMember = sourceCode.getTokenBefore(currentToken, {
            includeComments: true,
          })!;
          context.report({
            loc: currentToken.loc,
            messageId: 'memberOnNewline',
            fix(fixer) {
              return fixer.replaceTextRange(
                [tokenBeforeMember.range[1], currentToken.range[0]],
                lineEnding,
              );
            },
          });
        }
        previousMember = member;
      }
    }

    function checkNamedSpecifiers(
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
      specifiers: ReadonlyArray<TSESTree.ImportSpecifier | TSESTree.ExportSpecifier>,
    ): void {
      if (specifiers.length < 2) {
        return;
      }

      const openingBrace = sourceCode.getTokenBefore(specifiers[0])!;
      const closingBrace = sourceCode.getTokenAfter(specifiers.at(-1)!, {
        filter: (token) => token.value === '}',
      })!;
      if (openingBrace.loc.start.line === closingBrace.loc.end.line) {
        return;
      }

      checkMembers(node, specifiers);
    }

    return {
      ImportDeclaration(node): void {
        if (options.ImportDeclaration) {
          checkNamedSpecifiers(
            node,
            node.specifiers.filter((specifier) => specifier.type === 'ImportSpecifier'),
          );
        }
      },
      ExportNamedDeclaration(node): void {
        if (options.ExportDeclaration) {
          checkNamedSpecifiers(node, node.specifiers);
        }
      },
      ObjectExpression(node): void {
        checkMembers(node, node.properties);
      },
      ObjectPattern(node): void {
        checkMembers(node, node.properties);
      },
      ArrayExpression(node): void {
        checkMembers(node, node.elements, true);
      },
      ArrayPattern(node): void {
        checkMembers(node, node.elements, true);
      },
      TSTypeLiteral(node): void {
        checkMembers(node, node.members);
      },
      TSInterfaceBody(node): void {
        checkMembers(node, node.body);
      },
      TSEnumBody(node): void {
        checkMembers(node, node.members);
      },
      TSTupleType(node): void {
        checkMembers(node, node.elementTypes, true);
      },
    };
  },
});

export default multilineContainerMemberNewline;
