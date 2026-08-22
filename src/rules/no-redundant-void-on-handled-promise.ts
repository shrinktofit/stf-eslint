import ts from 'typescript';
import * as tsutils from 'ts-api-utils';
import { isPromiseLike } from '@typescript-eslint/type-utils';
import {
  AST_NODE_TYPES,
  ESLintUtils,
  type TSESLint,
  type TSESTree,
} from '@typescript-eslint/utils';

interface RuleDocs {
  recommended: boolean;
  requiresTypeChecking: boolean;
}

export interface NoRedundantVoidOnHandledPromiseOptions {
  checkThenables?: boolean;
}

type Options = [NoRedundantVoidOnHandledPromiseOptions];

const defaultOptions: Options = [{ checkThenables: false }];

const uncertainValueFlags = ts.TypeFlags.Any
  | ts.TypeFlags.Unknown
  | ts.TypeFlags.Never
  | ts.TypeFlags.Void
  | ts.TypeFlags.Undefined
  | ts.TypeFlags.Null;

const constrainedValueFlags = ts.TypeFlags.TypeParameter
  | ts.TypeFlags.Conditional
  | ts.TypeFlags.IndexedAccess
  | ts.TypeFlags.Substitution;

function unwrapTransparentExpressions(expression: TSESTree.Expression): TSESTree.Expression {
  let currentExpression = expression;

  while (true) {
    switch (currentExpression.type) {
    case AST_NODE_TYPES.ChainExpression:
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSInstantiationExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
    case AST_NODE_TYPES.TSTypeAssertion:
      currentExpression = currentExpression.expression;
      break;
    default:
      return currentExpression;
    }
  }
}

const noRedundantVoidOnHandledPromise: TSESLint.RuleModule<'redundantVoid', Options> = ESLintUtils.RuleCreator<RuleDocs>(
  (name) => `https://github.com/shrinktofit/stf-eslint/blob/main/docs/rules/${name}.md`,
)({
  name: 'no-redundant-void-on-handled-promise',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow redundant void operators on handled Promise statements',
      recommended: true,
      requiresTypeChecking: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          checkThenables: {
            type: 'boolean',
            description: 'Whether to check structural Thenable values in addition to native Promises.',
          },
        },
      },
    ],
    messages: {
      redundantVoid: 'Remove the redundant `void` operator from this handled Promise.',
    },
  },
  defaultOptions,
  create(context, [options]) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const sourceCode = context.sourceCode;

    function parameterCanBeCallable(
      parameter: ts.Symbol,
      location: ts.Node,
    ): boolean {
      const parameterType = checker.getApparentType(
        checker.getTypeOfSymbolAtLocation(parameter, location),
      );
      return tsutils.unionConstituents(parameterType)
        .some((typePart) => typePart.getCallSignatures().length > 0);
    }

    function isStructuralThenable(
      type: ts.Type,
      location: ts.Node,
    ): boolean {
      for (const typePart of tsutils.unionConstituents(checker.getApparentType(type))) {
        const thenProperty = typePart.getProperty('then');
        if (thenProperty === undefined) {
          continue;
        }

        const thenType = checker.getTypeOfSymbolAtLocation(thenProperty, location);
        for (const thenTypePart of tsutils.unionConstituents(thenType)) {
          for (const signature of thenTypePart.getCallSignatures()) {
            if (
              signature.parameters.length >= 2
              && parameterCanBeCallable(signature.parameters[0], location)
              && parameterCanBeCallable(signature.parameters[1], location)
            ) {
              return true;
            }
          }
        }
      }

      return false;
    }

    function isDefinitelyThenable(
      type: ts.Type,
      location: ts.Node,
    ): boolean {
      if (type.isUnion()) {
        return type.types.every((unionPart) => isDefinitelyThenable(unionPart, location));
      }

      if ((type.flags & uncertainValueFlags) !== 0) {
        return false;
      }

      if ((type.flags & constrainedValueFlags) !== 0) {
        const constraint = checker.getBaseConstraintOfType(type);
        return constraint !== undefined
          && constraint !== type
          && isDefinitelyThenable(constraint, location);
      }

      if (isPromiseLike(services.program, type)) {
        return true;
      }

      return options.checkThenables === true
        && isStructuralThenable(type, location);
    }

    function isDefinitelyCallable(type: ts.Type): boolean {
      if (type.isUnion()) {
        return type.types.every(isDefinitelyCallable);
      }

      if ((type.flags & uncertainValueFlags) !== 0) {
        return false;
      }

      if ((type.flags & constrainedValueFlags) !== 0) {
        const constraint = checker.getBaseConstraintOfType(type);
        return constraint !== undefined
          && constraint !== type
          && isDefinitelyCallable(constraint);
      }

      return checker.getApparentType(type).getCallSignatures().length > 0;
    }

    function isDefinitelyPresent(type: ts.Type): boolean {
      if (type.isUnion()) {
        return type.types.every(isDefinitelyPresent);
      }

      if ((type.flags & uncertainValueFlags) !== 0) {
        return false;
      }

      if ((type.flags & constrainedValueFlags) !== 0) {
        const constraint = checker.getBaseConstraintOfType(type);
        return constraint !== undefined
          && constraint !== type
          && isDefinitelyPresent(constraint);
      }

      return true;
    }

    function getMemberTypeWhenChainContinues(
      expression: TSESTree.MemberExpression,
      objectType: ts.Type,
      chainMayShortCircuit: boolean,
    ): ts.Type | undefined {
      const expressionType = services.getTypeAtLocation(expression);
      if (!chainMayShortCircuit || isDefinitelyPresent(expressionType)) {
        return expressionType;
      }

      let propertyName: string | undefined;
      if (
        !expression.computed
        && expression.property.type === AST_NODE_TYPES.Identifier
      ) {
        propertyName = expression.property.name;
      } else if (
        expression.computed
        && expression.property.type === AST_NODE_TYPES.Literal
        && typeof expression.property.value === 'string'
      ) {
        propertyName = expression.property.value;
      }

      const property = propertyName === undefined
        ? undefined
        : checker.getPropertyOfType(checker.getApparentType(objectType), propertyName);
      if (property === undefined) {
        return undefined;
      }

      const declaredPropertyType = checker.getTypeOfSymbolAtLocation(
        property,
        services.esTreeNodeToTSNodeMap.get(expression.object),
      );
      return isDefinitelyPresent(declaredPropertyType)
        ? checker.getNonNullableType(expressionType)
        : expressionType;
    }

    function inspectOptionalChainResult(
      expression: TSESTree.Expression,
    ): { canShortCircuit: boolean; type: ts.Type } | undefined {
      if (expression.type === AST_NODE_TYPES.ChainExpression) {
        return {
          canShortCircuit: false,
          type: services.getTypeAtLocation(expression),
        };
      }

      if (
        expression.type === AST_NODE_TYPES.TSAsExpression
        || expression.type === AST_NODE_TYPES.TSInstantiationExpression
        || expression.type === AST_NODE_TYPES.TSNonNullExpression
        || expression.type === AST_NODE_TYPES.TSSatisfiesExpression
        || expression.type === AST_NODE_TYPES.TSTypeAssertion
      ) {
        const innerResult = inspectOptionalChainResult(expression.expression);
        return innerResult === undefined
          ? undefined
          : {
            canShortCircuit: innerResult.canShortCircuit,
            type: services.getTypeAtLocation(expression),
          };
      }

      if (expression.type === AST_NODE_TYPES.MemberExpression) {
        if (expression.object.type === AST_NODE_TYPES.Super) {
          return undefined;
        }

        const objectResult = inspectOptionalChainResult(expression.object);
        if (objectResult === undefined) {
          return undefined;
        }

        const objectType = expression.optional
          ? checker.getNonNullableType(objectResult.type)
          : objectResult.type;
        if (!expression.optional && !isDefinitelyPresent(objectType)) {
          return undefined;
        }

        const chainMayShortCircuit = objectResult.canShortCircuit || expression.optional;
        const propertyType = getMemberTypeWhenChainContinues(
          expression,
          objectType,
          chainMayShortCircuit,
        );
        return propertyType === undefined
          ? undefined
          : {
            canShortCircuit: chainMayShortCircuit,
            type: propertyType,
          };
      }

      if (expression.type === AST_NODE_TYPES.CallExpression) {
        if (expression.callee.type === AST_NODE_TYPES.Super) {
          return undefined;
        }

        const calleeResult = inspectOptionalChainResult(expression.callee);
        if (calleeResult === undefined) {
          return undefined;
        }

        const calleeType = expression.optional
          ? checker.getNonNullableType(calleeResult.type)
          : calleeResult.type;
        if (!isDefinitelyCallable(calleeType)) {
          return undefined;
        }

        const chainMayShortCircuit = calleeResult.canShortCircuit || expression.optional;
        const expressionType = services.getTypeAtLocation(expression);
        let continuedType = expressionType;
        if (chainMayShortCircuit && !isDefinitelyPresent(expressionType)) {
          let returnIsDefinitelyPresent: boolean;
          if (calleeType.isUnion()) {
            returnIsDefinitelyPresent = calleeType.types.every((unionPart) => {
              const signatures = checker.getApparentType(unionPart).getCallSignatures();
              return signatures.length > 0
                && signatures.every((signature) =>
                  isDefinitelyPresent(checker.getReturnTypeOfSignature(signature)));
            });
          } else {
            const callLocation = services.esTreeNodeToTSNodeMap.get(expression);
            const selectedSignature = ts.isCallExpression(callLocation)
              ? checker.getResolvedSignature(callLocation)
              : undefined;
            const selectedDeclaration = selectedSignature?.getDeclaration();
            const declarationSignature = selectedDeclaration === undefined
              ? undefined
              : checker.getSignatureFromDeclaration(selectedDeclaration);
            returnIsDefinitelyPresent = declarationSignature !== undefined
              && isDefinitelyPresent(checker.getReturnTypeOfSignature(declarationSignature));
          }

          if (returnIsDefinitelyPresent) {
            continuedType = checker.getNonNullableType(expressionType);
          }
        }

        return {
          canShortCircuit: chainMayShortCircuit,
          type: continuedType,
        };
      }

      return {
        canShortCircuit: false,
        type: services.getTypeAtLocation(expression),
      };
    }

    function inspectReceiverWhenCallRuns(
      receiver: TSESTree.Expression,
      terminalMemberIsOptional: boolean,
    ): { chainMayShortCircuit: boolean; type: ts.Type } | undefined {
      const receiverResult = inspectOptionalChainResult(receiver);
      if (receiverResult === undefined) {
        return undefined;
      }

      const receiverType = terminalMemberIsOptional
        ? checker.getNonNullableType(receiverResult.type)
        : receiverResult.type;
      const receiverLocation = services.esTreeNodeToTSNodeMap.get(receiver);
      if (
        (!terminalMemberIsOptional && !isDefinitelyPresent(receiverType))
        || !isDefinitelyThenable(receiverType, receiverLocation)
      ) {
        return undefined;
      }

      return {
        chainMayShortCircuit: receiverResult.canShortCircuit,
        type: receiverType,
      };
    }

    return {
      UnaryExpression(node): void {
        if (
          node.operator !== 'void'
          || node.parent.type !== AST_NODE_TYPES.ExpressionStatement
          || node.parent.expression !== node
        ) {
          return;
        }

        const terminalExpression = unwrapTransparentExpressions(node.argument);
        if (
          terminalExpression.type !== AST_NODE_TYPES.CallExpression
          || terminalExpression.callee.type !== AST_NODE_TYPES.MemberExpression
        ) {
          return;
        }

        const memberExpression = terminalExpression.callee;
        let methodName: string | undefined;
        if (
          !memberExpression.computed
          && memberExpression.property.type === AST_NODE_TYPES.Identifier
        ) {
          methodName = memberExpression.property.name;
        } else if (
          memberExpression.computed
          && memberExpression.property.type === AST_NODE_TYPES.Literal
          && typeof memberExpression.property.value === 'string'
        ) {
          methodName = memberExpression.property.value;
        }

        let rejectionHandler: TSESTree.CallExpressionArgument | undefined;
        if (methodName === 'catch') {
          rejectionHandler = terminalExpression.arguments[0];
        } else if (methodName === 'then') {
          rejectionHandler = terminalExpression.arguments[1];
        } else {
          return;
        }

        if (
          rejectionHandler === undefined
          || rejectionHandler.type === AST_NODE_TYPES.SpreadElement
        ) {
          return;
        }

        if (memberExpression.object.type === AST_NODE_TYPES.Super) {
          return;
        }

        const receiver = inspectReceiverWhenCallRuns(
          memberExpression.object,
          memberExpression.optional,
        );
        if (receiver === undefined) {
          return;
        }

        const methodType = getMemberTypeWhenChainContinues(
          memberExpression,
          receiver.type,
          receiver.chainMayShortCircuit || memberExpression.optional,
        );
        if (methodType === undefined) {
          return;
        }
        if (!isDefinitelyCallable(methodType)) {
          return;
        }

        const handlerType = services.getTypeAtLocation(rejectionHandler);
        if (!isDefinitelyCallable(handlerType)) {
          return;
        }

        const voidToken = sourceCode.getFirstToken(node);
        if (voidToken === null) {
          return;
        }

        const followingToken = sourceCode.getTokenAfter(voidToken, {
          includeComments: true,
        });
        const followingSyntaxToken = sourceCode.getTokenAfter(voidToken);
        if (followingToken === null || followingSyntaxToken === null) {
          return;
        }

        const previousToken = sourceCode.getTokenBefore(node.parent);
        const expressionStartRequiresGuard = ['(', '[', '`', '+', '-', '/', '<']
          .includes(followingSyntaxToken.value);
        const previousTokenEndsStatement = previousToken === null
          || [';', '{', '}', ':'].includes(previousToken.value);
        const canAutofix = !expressionStartRequiresGuard || previousTokenEndsStatement;

        context.report({
          node: voidToken,
          messageId: 'redundantVoid',
          fix(fixer) {
            if (!canAutofix) {
              return null;
            }

            return fixer.removeRange([voidToken.range[0], followingToken.range[0]]);
          },
        });
      },
    };
  },
});

export default noRedundantVoidOnHandledPromise;
