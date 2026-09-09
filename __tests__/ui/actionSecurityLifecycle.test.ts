import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  defaultRules,
  Level,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import {
  getDefaultSecurityEngineState,
  useSecurityEngineStore,
} from '@/ui/state/securityEngine';
import {
  getActionSecurityGate,
  hasActionSecurityError,
} from '@/ui/views/Approval/components/SecurityEngine/actionSecurity';

jest.mock('@/ui/wallet', () => ({ wallet: {} }));

/**
 * Mount the page's actual evaluation statements without loading its unrelated
 * wallet, gas, chart and hardware UI. The effect and submission predicate are
 * extracted from the TypeScript AST, not reproduced in the test.
 */
function loadTransactionSecurityHook() {
  const filename = path.resolve(
    __dirname,
    '../../src/ui/views/Approval/components/SignTx.tsx'
  );
  const source = fs.readFileSync(filename, 'utf8');
  const ast = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const declaration = ast.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((item) => item.name.getText(ast) === 'SignTx');
  if (
    !declaration?.initializer ||
    !ts.isArrowFunction(declaration.initializer) ||
    !ts.isBlock(declaration.initializer.body)
  ) {
    throw new Error('Cannot locate SignTx component');
  }
  const statements = [...declaration.initializer.body.statements];
  const declares = (statement: ts.Statement, name: string) =>
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(
      (item) => item.name.getText(ast) === name
    );
  const start = statements.findIndex((statement) =>
    declares(statement, 'executeEngine')
  );
  const end = statements.findIndex((statement) =>
    declares(statement, 'executeSecurityEngine')
  );
  const evaluationEffect = statements.find(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      statement.expression.expression.getText(ast) === 'useEffect' &&
      statement.expression.arguments[1]?.getText(ast) ===
        '[preparedActions, userData, rules, securityReload]'
  );
  if (start < 0 || end < start || !evaluationEffect) {
    throw new Error('Cannot locate SignTx security evaluation');
  }
  const securityCode = statements
    .slice(start, end + 1)
    .map((statement) => statement.getText(ast))
    .join('\n');
  const code = ts.transpileModule(
    `
    function useTransactionSecurity(props: any) {
      const securityEngine = useSecurityEngineStore();
      const { rules, userData, currentTx } = securityEngine;
      const { wallet, Sentry } = props;
      const approvalId = 'approval-1';
      const [preparedActions, setPreparedActions] = useState(null);
      const preparedActionsRef = useRef(preparedActions);
      preparedActionsRef.current = preparedActions;
      const isReady = true;
      const canResolveSecurityRef = useRef(() => false);
      ${
        securityCode.includes('const evaluationSequence')
          ? ''
          : 'const evaluationSequence = useRef(0);'
      }
      ${securityCode}
      ${evaluationEffect.getText(ast)}
      return {
        setPreparedActions, invalidateSecurity, reload: executeSecurityEngine,
        isSecurityReady, securityError, securityBlocked, securityGroups,
        securityGate, isMultiActions, engineResults, multiActionEngineResultList,
        canResolve: canResolveSecurityRef.current,
      };
    }
  `,
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    }
  ).outputText;
  return new Function(
    'dependencies',
    `
    const { React, useSecurityEngineStore, getActionSecurityGate, hasActionSecurityError } = dependencies;
    const { useState, useRef, useMemo, useEffect } = React;
    ${code}
    return useTransactionSecurity;
  `
  )({
    React,
    useSecurityEngineStore,
    getActionSecurityGate,
    hasActionSecurityError,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const risk = (id = '1016', level = Level.DANGER): Result => ({
  id,
  level,
  enable: true,
  value: 0,
  valueDescription: '',
  valueDefine: defaultRules[0].valueDefine,
  threshold: {},
});

describe('SignTx action security lifecycle', () => {
  const useTransactionSecurity = loadTransactionSecurityHook();
  const reactActEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  let root: Root;
  let current: any;
  let requests: {
    promise: Promise<Result[]>;
    resolve: (value: Result[]) => void;
    reject: (reason: unknown) => void;
  }[];
  let captureException: jest.Mock;

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    useSecurityEngineStore.setState(getDefaultSecurityEngineState());
    requests = [];
    captureException = jest.fn();
    const wallet = {
      executeSecurityEngine: jest.fn(() => {
        const request = deferred<Result[]>();
        requests.push(request);
        return request.promise;
      }),
    };
    root = createRoot(document.createElement('div'));
    const Consumer = () => {
      current = useTransactionSecurity({
        wallet,
        Sentry: { captureException },
      });
      return null;
    };
    act(() => root.render(React.createElement(Consumer)));
  });

  afterEach(() => {
    act(() => root.unmount());
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  const prepare = (type: 'single' | 'multi', count: number) => {
    act(() =>
      current.setPreparedActions({
        type,
        actions: Array.from({ length: count }, (_, index) => ({
          data: { index },
          requireData: {},
          ctx: { index },
        })),
      })
    );
  };

  test('waits for every sub-action, then blocks risks independently of SAFE actions', async () => {
    expect(current.canResolve()).toBe(false);
    prepare('multi', 2);
    expect(requests).toHaveLength(2);
    await act(async () => requests[0].resolve([risk()]));
    expect(current.isSecurityReady).toBe(false);
    expect(current.canResolve()).toBe(false);
    await act(async () => requests[1].resolve([risk('safe', Level.SAFE)]));
    expect(current.isSecurityReady).toBe(true);
    expect(current.securityGate.securityLevel).toBe(Level.DANGER);
    expect(current.securityBlocked).toBe(true);
    act(() =>
      useSecurityEngineStore
        .getState()
        .processAllRules(current.securityGate.pendingRuleKeys)
    );
    expect(current.canResolve()).toBe(true);
  });

  test.each(['rules', 'userData'] as const)(
    'reloads all actions after %s change and invalidates old consent immediately',
    async (setting) => {
      prepare('multi', 2);
      await act(async () => {
        requests[0].resolve([risk()]);
        requests[1].resolve([risk()]);
      });
      act(() =>
        useSecurityEngineStore
          .getState()
          .processAllRules(current.securityGate.pendingRuleKeys)
      );
      const oldCanResolve = current.canResolve;
      const oldScopes = current.securityGroups.map((group) => group.scope);
      expect(oldCanResolve()).toBe(true);
      act(() => {
        const state = useSecurityEngineStore.getState();
        if (setting === 'rules')
          useSecurityEngineStore.setState({ rules: [...state.rules] });
        else
          useSecurityEngineStore.setState({ userData: { ...state.userData } });
        expect(oldCanResolve()).toBe(false);
      });
      expect(requests).toHaveLength(4);
      expect(current.canResolve()).toBe(false);
      await act(async () => {
        requests[2].resolve([risk()]);
        requests[3].resolve([risk()]);
      });
      expect(current.securityGroups.map((group) => group.scope)).not.toEqual(
        oldScopes
      );
      expect(current.securityGate.pendingRuleKeys).toHaveLength(2);
      act(() =>
        useSecurityEngineStore
          .getState()
          .processAllRules(current.securityGate.pendingRuleKeys)
      );
      expect(current.canResolve()).toBe(true);
      expect(oldCanResolve()).toBe(false);
    }
  );

  test('ignores late batch results after switching to a single action with no applicable rules', async () => {
    prepare('multi', 2);
    prepare('single', 1);
    await act(async () => requests[2].resolve([]));
    expect(current.isMultiActions).toBe(false);
    expect(current.canResolve()).toBe(true);
    const singleScope = current.securityGroups[0].scope;
    await act(async () => {
      requests[0].resolve([risk()]);
      requests[1].resolve([risk()]);
    });
    expect(current.canResolve()).toBe(true);
    expect(current.securityGroups).toEqual([
      { scope: singleScope, results: [] },
    ]);
    prepare('multi', 2);
    expect(current.engineResults).toEqual([]);
    expect(current.canResolve()).toBe(false);
  });

  test.each(['reject', 'rule error'])(
    'fails closed on %s and recovers only after a complete retry',
    async (failure) => {
      prepare('single', 1);
      await act(async () => {
        if (failure === 'reject')
          requests[0].reject(new Error('engine unavailable'));
        else requests[0].resolve([risk('failed', Level.ERROR)]);
      });
      expect(current.securityError).toBe(true);
      expect(current.canResolve()).toBe(false);
      act(() => current.reload());
      expect(current.securityError).toBe(false);
      expect(current.canResolve()).toBe(false);
      await act(async () => requests[1].resolve([]));
      expect(current.canResolve()).toBe(true);
    }
  );
});
