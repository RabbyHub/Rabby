import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { execFileSync } from 'child_process';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { useBatchSignTypedDataTask } from '@/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask';

jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({
  useSetDirectSigning: () => mockSetDirectSigning,
}));
jest.mock('@/ui/utils/sendPersonalMessage', () => ({
  sendPersonalMessage: (...args) => mockSend(...args),
}));
jest.mock('@/ui/utils/sendTypedData', () => ({
  sendSignTypedData: (...args) => mockSend(...args),
}));
const mockSend = jest.fn();
const mockWallet = {};
const mockSetDirectSigning = jest.fn();
const compiled = ts.transpileModule(
  readFileSync(
    resolve(
      __dirname,
      '../../src/ui/views/Approval/components/MiniPersonalMessgae/useBatchPersonalMessageTask.tsx'
    ),
    'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }
).outputText;
const hookExports: any = {};
new Function('require', 'exports', compiled)(require, hookExports);
const { useBatchSignPersonalMessageTask } = hookExports;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('direct signing receives a prefetch that was already in flight', () => {
  expect(() =>
    execFileSync(
      process.execPath,
      ['__tests__/fixtures/miniPrefetchRepro.cjs'],
      {
        cwd: resolve(__dirname, '../..'),
        encoding: 'utf8',
      }
    )
  ).not.toThrow();
});

const pending = () => {
  let resolve!: (value: any) => void;
  let reject!: (error: any) => void;
  const promise = new Promise<any>((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
};
const item = { tx: { data: ['message', 'address'] }, status: 'idle' };

describe.each([
  ['personal message', useBatchSignPersonalMessageTask],
  ['typed data', useBatchSignTypedDataTask],
] as const)('%s local errors', (_, useTask) => {
  const tasks: any[] = [];
  let roots: ReturnType<typeof createRoot>[];
  let log: jest.SpyInstance;
  beforeEach(async () => {
    mockSend.mockReset();
    log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    roots = [0, 1].map(() => createRoot(document.createElement('div')));
    function Harness({ index }: { index: number }) {
      tasks[index] = useTask({});
      return null;
    }
    await act(async () =>
      roots.forEach((root, index) =>
        root.render(React.createElement(Harness, { index }))
      )
    );
    await act(async () => tasks.forEach((task) => task.init([item])));
  });
  afterEach(async () => {
    await act(async () => roots.forEach((root) => root.unmount()));
    log.mockRestore();
  });

  it('A hardware failure leaves B running and does not broadcast a local error', async () => {
    const a = pending();
    const b = pending();
    mockSend.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    let resultA!: Promise<any>;
    let resultB!: Promise<any>;
    const broadcast = jest.fn();
    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, broadcast);
    await act(async () => {
      resultA = tasks[0].start().catch((e) => e);
      resultB = tasks[1].start();
    });
    await act(async () => {
      a.reject(new Error('DISCONNECTED'));
      await resultA;
    });
    expect(tasks[0].hardwareError).toBe('DISCONNECTED');
    expect(tasks[1].hardwareError).toBeUndefined();
    expect(tasks[1].status).toBe('active');
    expect(broadcast).not.toHaveBeenCalled();
    await act(async () => {
      b.resolve({ txHash: 'b' });
      await resultB;
    });
    expect(tasks[1].status).toBe('completed');
    eventBus.removeEventListener(EVENTS.COMMON_HARDWARE.REJECTED, broadcast);
  });

  it('a replaced task ignores the old signature failure', async () => {
    const old = pending();
    const next = pending();
    mockSend.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    let oldResult!: Promise<any>;
    let nextResult!: Promise<any>;
    await act(async () => {
      oldResult = tasks[0].start().catch((e) => e);
    });
    await act(async () => tasks[0].init([item]));
    await act(async () => {
      nextResult = tasks[0].start();
    });
    await act(async () => {
      old.reject(new Error('DISCONNECTED'));
      await oldResult;
    });
    expect(tasks[0].hardwareError).toBeUndefined();
    expect(tasks[0].status).toBe('active');
    await act(async () => {
      next.resolve({ txHash: 'new' });
      await nextResult;
    });
    expect(tasks[0].status).toBe('completed');
  });
});
