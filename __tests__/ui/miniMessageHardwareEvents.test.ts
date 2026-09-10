import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import eventBus from '@/eventBus';
import { EVENTS, KEYRING_CLASS } from '@/constant';
import { useBatchSignPersonalMessageTask } from '@/ui/views/Approval/components/MiniPersonalMessgae/useBatchPersonalMessageTask';
import { useBatchSignTypedDataTask } from '@/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask';
import { useBatchSignTxTask } from '@/ui/views/Approval/components/MiniSignTx/useBatchSignTxTask';
import { toSigningAttemptRef } from '@/utils/signingTypes';

jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({
  useSetDirectSigning: () => jest.fn(),
}));
jest.mock('@/ui/utils/sendPersonalMessage', () => ({
  sendPersonalMessage: (...args) => mockSend(...args),
}));
jest.mock('@/ui/utils/sendTypedData', () => ({
  sendSignTypedData: (...args) => mockSend(...args),
}));
jest.mock('@/ui/utils/sendTransaction', () => ({
  sendTransaction: (...args) => mockSend(...args),
}));
jest.mock('@/ui/utils/ledger', () => ({
  isLedgerLockError: (s: string) => s.includes('0x5515'),
  isLedgerConnectionRecoverableError: () => false,
}));
const mockSend = jest.fn();
const mockWallet = {
  startDirectSigning: jest.fn(),
  endDirectSigning: jest.fn(),
  retryTxReset: jest.fn().mockResolvedValue(undefined),
  getRetryTxType: jest.fn().mockResolvedValue(undefined),
};
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// Real hooks; only the wallet boundary and device/network submission are mocked.
describe.each([
  ['personal-sign', useBatchSignPersonalMessageTask],
  ['typed-data', useBatchSignTypedDataTask],
  ['transaction', useBatchSignTxTask],
] as const)('%s local signing recovery', (_, useTask) => {
  const account = { address: '0x123', type: KEYRING_CLASS.HARDWARE.LEDGER };
  let task: ReturnType<typeof useBatchSignTxTask>;
  let root: ReturnType<typeof createRoot>;
  let log: jest.SpyInstance;
  const recover = jest.fn();
  const item = {
    tx: {
      data: ['message', account.address],
      from: account.address,
      chainId: 1,
    },
    options: { account },
    status: 'idle',
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    mockSend.mockReset();
    mockWallet.startDirectSigning
      .mockReset()
      .mockResolvedValueOnce('first')
      .mockResolvedValue('retry');
    mockWallet.endDirectSigning.mockReset().mockResolvedValue(true);
    log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    function Harness() {
      task = useTask({}) as typeof task;
      React.useEffect(() => {
        task.onErrorRef.current = recover;
        return () => {
          task.onErrorRef.current = undefined;
        };
      }, [task.onErrorRef]);
      return null;
    }
    root = createRoot(document.createElement('div'));
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => task.init([item as any]));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    log.mockRestore();
  });

  it('ignores a dapp error, then handles its own failure and retries with fresh permission', async () => {
    let fail!: (error: Error) => void;
    mockSend.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        })
    );
    let pending!: Promise<unknown>;
    await act(async () => {
      pending = task.start().catch((error) => error);
    });
    await act(async () =>
      eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, {
        attempt: toSigningAttemptRef('dapp', 'attempt'),
        errorMsg: '0x5515',
      })
    );
    expect(recover).not.toHaveBeenCalled();
    await act(async () => {
      fail(new Error('0x5515'));
      await pending;
    });
    expect(recover).toHaveBeenCalledWith('0x5515');
    expect(recover).toHaveBeenCalledTimes(1);
    expect(mockWallet.endDirectSigning).toHaveBeenCalledWith('first');
    mockSend.mockResolvedValueOnce({ txHash: 'signature' });
    await act(async () => {
      await task.retry();
    });
    expect(
      mockSend.mock.calls.map(([options]) => options.directSigning)
    ).toEqual(['first', 'retry']);
    expect(task.status).toBe('completed');
  });

  it.each(['success', 'error'])(
    'ignores late %s and progress after reset while a new run is active',
    async (late) => {
      let finish!: (value: unknown) => void;
      let fail!: (error: Error) => void;
      mockSend.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            finish = resolve;
            fail = reject;
          })
      );
      let old!: Promise<unknown>;
      await act(async () => {
        old = task.start().catch((error) => error);
      });
      const oldProgress = mockSend.mock.calls[0][0].onProgress;
      await act(async () => task.init([item as any]));
      expect(mockWallet.endDirectSigning).toHaveBeenCalledWith('first');
      let finishNew!: (value: unknown) => void;
      mockSend.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishNew = resolve;
          })
      );
      let current!: Promise<unknown>;
      await act(async () => {
        current = task.start();
      });
      await act(async () => {
        oldProgress('signed');
        if (late === 'success') finish({ txHash: 'old' });
        else fail(new Error('0x5515'));
        await old;
      });
      expect(recover).not.toHaveBeenCalled();
      expect(task.status).toBe('active');
      expect(task.list[0].status).toBe('idle');
      expect(mockWallet.endDirectSigning).not.toHaveBeenCalledWith('retry');
      await act(async () => {
        finishNew({ txHash: 'new' });
        await current;
      });
      expect(task.status).toBe('completed');
    }
  );

  it.each(['success', 'error'])(
    'rejects a late %s invalidated by the background session',
    async (late) => {
      if (late === 'success')
        mockSend.mockResolvedValueOnce({ txHash: 'late' });
      else mockSend.mockRejectedValueOnce(new Error('0x5515'));
      mockWallet.endDirectSigning.mockResolvedValue(false);
      await act(async () => {
        await expect(task.start()).rejects.toThrow('User cancelled');
      });
      expect(task.status).not.toBe('completed');
      expect(recover).not.toHaveBeenCalled();
    }
  );
});
