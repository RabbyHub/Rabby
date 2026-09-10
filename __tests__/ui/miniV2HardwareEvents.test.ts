import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { EVENTS, KEYRING_CLASS } from '@/constant';
import eventBus from '@/eventBus';
import { toSigningAttemptRef } from '@/utils/signingTypes';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2/state/TypedDataSignatureManager';
import { SignatureManager } from '@/ui/component/MiniSignV2/state/SignatureManager';

jest.mock('@/ui/utils', () => ({ hasConnectedLedgerDevice: async () => true }));
jest.mock('@/ui/component/MiniSignV2/services', () => ({
  SignatureSteps: {},
  signatureService: {
    fingerprint: (txs) => JSON.stringify(txs),
    prepare: async ({ txs }) => ({
      txs,
      chainId: 1,
      txsCalc: [{ preExecResult: { pre_exec: { success: true } } }],
    }),
    send: (...args) => mockSendTx(...args),
  },
}));
jest.mock('@/ui/utils/ledger', () => ({
  isLedgerLockError: (s: string) => s.includes('0x5515'),
}));
jest.mock('@/ui/utils/sendTypedData', () => ({
  sendSignTypedData: (...args) => mockSendTyped(...args),
}));
const mockSendTyped = jest.fn();
const mockSendTx = jest.fn();
const wallet = {
  startDirectSigning: jest.fn(),
  endDirectSigning: jest.fn(),
  retryTxReset: jest.fn().mockResolvedValue(undefined),
};
const account = {
  address: '0x123',
  type: KEYRING_CLASS.HARDWARE.LEDGER,
  brandName: 'Ledger',
};
const typedRequest = {
  wallet: wallet as any,
  config: { mode: 'DIRECT' as const, account },
  txs: [{ from: account.address, data: {}, version: 'V4' as const }],
};
const txRequest = {
  config: { account },
  txs: [{ from: account.address, chainId: 1 } as any],
};
const foreignError = () =>
  eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, {
    attempt: toSigningAttemptRef('other-flow', 'other-attempt'),
    errorMsg: '0x5515',
  });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  typedDataSignatureStore.close();
  typedDataSignatureStore.onErrorRef.current = undefined;
  jest.clearAllMocks();
  mockSendTyped.mockReset();
  mockSendTx.mockReset();
  wallet.startDirectSigning
    .mockReset()
    .mockResolvedValueOnce('first')
    .mockResolvedValue('retry');
  wallet.endDirectSigning.mockReset().mockResolvedValue(true);
});
afterEach(() => typedDataSignatureStore.close());

// Execute the real UI adapter and registration effect without visual dependencies.
const source = (path: string) =>
  readFileSync(
    resolve(__dirname, '../../src/ui/views/Approval/components', path),
    'utf8'
  );
const compile = (code: string) =>
  ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
test.each(['MiniLedgerAction', 'MiniOneKeyAction'])(
  '%s receives its V2 error without waiting for another render',
  async (component) => {
    const taskCode = source(
      'MiniSignTypedData/MiniTypedDataApprovalV2.tsx'
    ).match(/const task = \{[\s\S]*?\} as any;/)![0];
    const listenerCode = source(`MiniSignTx/${component}.tsx`).match(
      /React.useEffect\(\(\) => \{\n    task.onErrorRef.current = handleHardwareError;[\s\S]*?\}, \[task.onErrorRef, handleHardwareError\]\);/
    )![0];
    const recover = jest.fn();
    function Harness() {
      const task = new Function(
        'typedDataSignatureStore',
        'status',
        'progress',
        'total',
        compile(taskCode) + '\nreturn task;'
      )(typedDataSignatureStore, 'signing', {}, 1);
      new Function(
        'React',
        'task',
        'handleHardwareError',
        compile(listenerCode)
      )(React, task, recover);
      return null;
    }
    mockSendTyped.mockRejectedValueOnce(new Error('0x5515'));
    const root = createRoot(document.createElement('div'));
    let pending!: Promise<unknown>;
    try {
      await act(async () => root.render(React.createElement(Harness)));
      await act(async () => {
        pending = typedDataSignatureStore
          .start(typedRequest)
          .catch((error) => error);
      });
      expect(recover).toHaveBeenCalledWith('0x5515');
      expect(recover).toHaveBeenCalledTimes(1);
      foreignError();
      expect(recover).toHaveBeenCalledTimes(1);
      mockSendTyped.mockResolvedValueOnce({ txHash: 'signature' });
      await act(async () => {
        typedDataSignatureStore.retry();
      });
      await expect(pending).resolves.toEqual(['signature']);
      expect(
        mockSendTyped.mock.calls.map(([options]) => options.directSigning)
      ).toEqual(['first', 'retry']);
    } finally {
      typedDataSignatureStore.close();
      await pending;
      await act(async () => root.unmount());
    }
  }
);

test.each(['success', 'error'])(
  'typed-data ignores a late %s after a new request replaces it',
  async (late) => {
    const recover = jest.fn();
    typedDataSignatureStore.onErrorRef.current = recover;
    let finish!: (value: unknown) => void;
    let fail!: (error: Error) => void;
    mockSendTyped.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          finish = resolve;
          fail = reject;
        })
    );
    let old!: Promise<unknown>;
    await act(async () => {
      old = typedDataSignatureStore.start(typedRequest).catch((error) => error);
    });
    let finishNew!: (value: unknown) => void;
    mockSendTyped.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishNew = resolve;
        })
    );
    let current!: Promise<unknown>;
    await act(async () => {
      current = typedDataSignatureStore.start({ ...typedRequest });
    });
    await expect(old).resolves.toBe('User cancelled');
    expect(wallet.endDirectSigning).toHaveBeenCalledWith('first');
    await act(async () => {
      if (late === 'success') finish({ txHash: 'old' });
      else fail(new Error('0x5515'));
    });
    expect(recover).not.toHaveBeenCalled();
    expect(typedDataSignatureStore.getState().progress?.current).toBe(0);
    expect(wallet.endDirectSigning).not.toHaveBeenCalledWith('retry');
    await act(async () => finishNew({ txHash: 'new' }));
    await expect(current).resolves.toEqual(['new']);
  }
);

test('transaction recovery uses the local failure and keeps retry state', async () => {
  const manager = new SignatureManager();
  const recover = jest.fn();
  manager.onErrorRef.current = recover;
  await manager.prefetch(txRequest, wallet as any);
  mockSendTx.mockResolvedValueOnce({
    error: { status: 'FAILED', description: '0x5515' },
  });
  await manager.send({ wallet: wallet as any });
  expect(recover).toHaveBeenCalledWith('0x5515');
  foreignError();
  expect(recover).toHaveBeenCalledTimes(1);
  mockSendTx.mockResolvedValueOnce([{ txHash: 'signature' }]);
  await expect(manager.retry({ wallet: wallet as any })).resolves.toEqual([
    'signature',
  ]);
  const [first, retry] = mockSendTx.mock.calls.map(([options]) => options);
  expect([first.directSigning, retry.directSigning]).toEqual([
    'first',
    'retry',
  ]);
  expect(retry.retryScope).toBe(first.retryScope);
  expect(manager.getState().status).toBe('idle');
  manager.close();
});

test.each(['success', 'error'])(
  'transaction ignores a late %s and progress after close',
  async (late) => {
    const manager = new SignatureManager();
    const recover = jest.fn();
    manager.onErrorRef.current = recover;
    await manager.prefetch(txRequest, wallet as any);
    let finish!: (value: unknown) => void;
    let fail!: (error: Error) => void;
    mockSendTx.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          finish = resolve;
          fail = reject;
        })
    );
    const pending = manager.send({ wallet: wallet as any });
    await Promise.resolve();
    const options = mockSendTx.mock.calls[0][0];
    manager.close();
    expect(wallet.endDirectSigning).toHaveBeenCalledWith('first');
    expect(options.shouldPause(0, 0)).toBe(true);
    options.onProgress({ signInfo: { currentTxIndex: 1 } });
    if (late === 'success') finish([{ txHash: 'late' }]);
    else fail(new Error('0x5515'));
    await pending;
    expect(recover).not.toHaveBeenCalled();
    expect(manager.getState()).toEqual({ status: 'idle' });
  }
);

test.each(['success', 'error'])(
  'typed-data rejects a late %s when the background session is invalid',
  async (late) => {
    const recover = jest.fn();
    typedDataSignatureStore.onErrorRef.current = recover;
    wallet.endDirectSigning.mockResolvedValue(false);
    if (late === 'success')
      mockSendTyped.mockResolvedValueOnce({ txHash: 'late' });
    else mockSendTyped.mockRejectedValueOnce(new Error('0x5515'));
    const rejected = jest.fn();
    let pending: Promise<unknown> | undefined;
    try {
      await act(async () => {
        pending = typedDataSignatureStore.start(typedRequest).catch(rejected);
      });
      expect(recover).not.toHaveBeenCalled();
      expect(rejected).toHaveBeenCalledWith('User cancelled');
    } finally {
      typedDataSignatureStore.close();
      await pending;
    }
  }
);

test.each(['success', 'error', 'throw'])(
  'transaction rejects a late %s when the background session is invalid',
  async (late) => {
    const manager = new SignatureManager();
    const recover = jest.fn();
    manager.onErrorRef.current = recover;
    wallet.endDirectSigning.mockResolvedValue(false);
    if (late === 'success')
      mockSendTx.mockResolvedValueOnce([{ txHash: 'late' }]);
    else if (late === 'error')
      mockSendTx.mockResolvedValueOnce({ error: { description: '0x5515' } });
    else mockSendTx.mockRejectedValueOnce(new Error('0x5515'));
    const rejected = jest.fn();
    let pending: Promise<unknown> | undefined;
    try {
      await act(async () => {
        pending = manager.openDirect(txRequest, wallet as any).catch(rejected);
      });
      expect(recover).not.toHaveBeenCalled();
      expect(rejected).toHaveBeenCalledWith('User cancelled');
    } finally {
      manager.close();
      await pending;
    }
  }
);
