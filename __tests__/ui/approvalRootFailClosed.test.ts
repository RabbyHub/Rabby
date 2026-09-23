import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { ModuleKind, transpileModule } from 'typescript';

// Approval/index.tsx renders `ApprovalComponent[approvalComponent]` with no
// guard. 'Unlock' is a real ApprovalKind (see notification.ts) that is
// deliberately not part of this UI dispatch barrel - it has its own route.
// If currentApproval is ever 'Unlock' when something navigates here (queue
// advancement past a coexisting approval, or a cross-window unlock broadcast
// racing Unlock/index.tsx's own binding), rendering <undefined/> crashes the
// whole notification window and leaves the approval permanently unsettleable.

describe('Approval root fails closed instead of crashing on an undispatchable approval', () => {
  let root: Root;
  let container: HTMLDivElement;
  let current: {
    id: string;
    data: { approvalComponent: string; account?: any };
  } | null;
  let mockHistoryReplace: jest.Mock;
  let mockRejectApprovalFor: jest.Mock;
  let Approval: any;

  const flush = async () => {
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
  };

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
    mockHistoryReplace = jest.fn();
    mockRejectApprovalFor = jest.fn(async () => ({ accepted: true }));
    const wallet = {
      getCurrentAccount: jest.fn(async () => ({ address: '0xaccount' })),
      rejectApprovalFor: mockRejectApprovalFor,
    };
    const modules: Record<string, any> = {
      react: React,
      'react-router-dom': {
        useHistory: () => ({ replace: mockHistoryReplace }),
      },
      'ui/utils': {
        useApproval: () => [async () => current],
        useWallet: () => wallet,
      },
      '@/ui/utils/type': {},
      './hooks/useApprovalUtils': {
        ApprovalUtilsProvider: ({ children }: any) => children,
      },
      '@/ui/state/securityEngine': {
        useSecurityEngineStore: () => () => undefined,
      },
      './components': {
        // Only SignTx exists on this stand-in barrel - deliberately no Unlock.
        SignTx: ({ approvalId }: { approvalId: string }) =>
          React.createElement('div', null, `SignTx:${approvalId}`),
      },
      './style.less': {},
      clsx: (...args: any[]) =>
        args.filter((arg) => typeof arg === 'string').join(' '),
      '@/ui/hooks/useEventBusListener': { useEventBusListener: () => {} },
      '@/constant': { EVENTS: { RELOAD_APPROVAL: 'RELOAD_APPROVAL' } },
      'background/service/notification': {},
    };
    const compiled = transpileModule(
      readFileSync(
        resolve(__dirname, '../../src/ui/views/Approval/index.tsx'),
        'utf8'
      ),
      {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          jsx: 2,
          esModuleInterop: true,
        },
      }
    ).outputText;
    const exports: any = {};
    runInNewContext(compiled, {
      exports,
      module: { exports },
      document,
      window,
      require: (name: string) => {
        if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
        return modules[name];
      },
    });
    Approval = exports.default;
  });

  afterEach(() => {
    act(() => root.unmount());
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  });

  test('rejects the exact undispatchable approval and navigates away instead of rendering <undefined/>', async () => {
    current = { id: 'unlock-1', data: { approvalComponent: 'Unlock' } };
    expect(() =>
      act(() => {
        root.render(React.createElement(Approval));
      })
    ).not.toThrow();
    await flush();

    expect(mockRejectApprovalFor).toHaveBeenCalledWith({
      approval: { id: 'unlock-1', component: 'Unlock' },
    });
    expect(mockHistoryReplace).toHaveBeenCalledWith('/');
    expect(container.textContent).toBe('');
  });

  test('a dispatchable approval renders normally and is not rejected', async () => {
    current = {
      id: 'signtx-1',
      data: { approvalComponent: 'SignTx', account: { address: '0xaccount' } },
    };
    act(() => {
      root.render(React.createElement(Approval));
    });
    await flush();

    expect(mockRejectApprovalFor).not.toHaveBeenCalled();
    expect(mockHistoryReplace).not.toHaveBeenCalled();
    expect(container.textContent).toContain('SignTx:signtx-1');
  });
});
