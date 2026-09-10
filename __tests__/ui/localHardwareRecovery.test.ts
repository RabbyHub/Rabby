import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { KEYRING_CLASS, EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { useBatchRevokeTask as useDesktopTask } from '@/ui/views/DesktopProfile/components/ApprovalsTabPane/components/BatchRevoke/useBatchRevokeTask';
import { useBatchRevokeTask as useManageTask } from '@/ui/views/ManageBatchApprovals/hooks/useBatchRevokeTask';

jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/ui/utils/sendTransaction', () => ({
  FailedCode: { GasTooHigh: 'GasTooHigh', SubmitTxFailed: 'SubmitTxFailed' },
  sendTransaction: (...args) => mockSend(...args),
}));
jest.mock('@/ui/views/GasAccount/hooks', () => ({
  useGasAccountSign: () => ({}),
}));
jest.mock('@/ui/hooks/backgroundState/useAccount', () => ({
  useCurrentAccount: () => mockAccount,
}));
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({
  supportedDirectSign: () => true,
  supportedHardwareDirectSign: () => true,
}));
jest.mock(
  '@/ui/views/DesktopProfile/components/ApprovalsTabPane/utils',
  () => ({ findIndexRevokeList: () => 0 })
);
jest.mock('@/ui/views/ManageApprovals/utils', () => ({
  findIndexRevokeList: () => 0,
}));

const mockSend = jest.fn();
const mockWallet = {
  buildDexSwap: jest.fn().mockResolvedValue([{ from: '0xowner' }]),
  approveToken: jest.fn().mockResolvedValue({ params: [{ from: '0x1' }] }),
};
let mockAccount = { type: KEYRING_CLASS.HARDWARE.LEDGER };
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const spender = (id: string) => ({
  id,
  $assetContract: { id },
  $assetToken: { id },
  $assetParent: { id },
});
const revokeList = [
  {
    approvalType: 'token' as const,
    chainServerId: 'eth',
    id: 'token',
    spender: '0x2',
  },
];
const success = { txHash: '0xhash', gasCost: {} };

describe.each([
  ['DesktopProfile', useDesktopTask],
  ['ManageBatchApprovals', useManageTask],
] as const)('%s local hardware recovery', (_, useTask) => {
  let task: ReturnType<typeof useTask>;
  let root: ReturnType<typeof createRoot>;
  let log: jest.SpyInstance;
  beforeEach(async () => {
    mockSend.mockReset();
    mockAccount = { type: KEYRING_CLASS.HARDWARE.LEDGER };
    log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    root = createRoot(document.createElement('div'));
    function Harness() {
      task = useTask();
      return null;
    }
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => task.init([spender('token')] as any, revokeList));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    log.mockRestore();
  });

  test.each([
    [KEYRING_CLASS.HARDWARE.LEDGER, 'UNKNOWN_ERROR (0x5515)'],
    [KEYRING_CLASS.HARDWARE.LEDGER, 'DISCONNECTED'],
    [KEYRING_CLASS.HARDWARE.ONEKEY, '901: device disconnected'],
  ])(
    'Still Revoke recovers %s %s without an operation id',
    async (type, message) => {
      mockAccount = { type };
      // Trigger a render so the current account is captured when the task starts.
      await act(async () => task.init([spender('token')] as any, revokeList));
      mockSend
        .mockRejectedValueOnce(
          Object.assign(new Error('Gas exceeds limit'), { name: 'GasTooHigh' })
        )
        .mockRejectedValueOnce(new Error(message))
        .mockResolvedValue(success);
      await act(async () => {
        task.start();
      });
      expect(task.status).toBe('completed');
      expect(task.list[0].$status).toMatchObject({ failedCode: 'GasTooHigh' });

      await act(async () =>
        eventBus.emit('COMMON_HARDWARE_REJECTED', {
          operation: {
            kind: 'signing-attempt',
            attempt: { flowId: 'foreign', attemptId: 'foreign' },
          },
          errorMsg: message,
        })
      );
      expect(task.status).toBe('completed');
      expect(task.hardwareError).toBeUndefined();

      await act(async () => {
        const pending = task.addRevokeTask(task.list[0], 0, true);
        task.continue();
        await pending;
      });
      expect(task.status).toBe('paused');
      expect(task.hardwareError).toBe(message);
      expect(mockSend).toHaveBeenCalledTimes(2);
      await act(async () => {
        task.continue();
      });
      expect(task.status).toBe('completed');
      expect(task.hardwareError).toBeUndefined();
      expect(task.list[0].$status).toMatchObject({ status: 'success' });
      expect(mockSend.mock.calls.map(([args]) => args.ignoreGasCheck)).toEqual([
        false,
        true,
        true,
      ]);
      expect(
        mockSend.mock.calls.every(([args]) => !('hardwareOperation' in args))
      ).toBe(true);
    }
  );

  test('a late failure cannot pause or retry a replacement batch', async () => {
    let fail!: (error: Error) => void;
    mockSend
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            fail = reject;
          })
      )
      .mockResolvedValue(success);
    await act(async () => {
      task.start();
    });
    const oldProgress = mockSend.mock.calls[0][0].onProgress;
    await act(async () =>
      task.init([spender('replacement')] as any, revokeList)
    );
    await act(async () => {
      oldProgress('signed');
      fail(new Error('DISCONNECTED'));
    });
    expect(task.status).toBe('idle');
    expect(task.txStatus).toBe('idle');
    expect(task.hardwareError).toBeUndefined();
    expect(task.list[0]).toEqual(spender('replacement'));
    await act(async () => {
      task.start();
    });
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(task.list[0].$status).toMatchObject({ status: 'success' });
  });
});

import { useBatchSwapTask } from '@/ui/views/DesktopSmallSwap/hooks/useBatchSwapTask';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';

jest.mock('@/ui/hooks/useSigner', () => ({
  useMiniSigner: () => ({ close: mockCloseSign }),
}));
jest.mock('@/ui/state/swap', () => ({
  useSwapStore: (select) => select({ supportedDEXList: mockDexes }),
}));
jest.mock('@/ui/views/Swap/hooks', () => ({
  useQuoteMethods: () => ({ getSingleQuote: mockQuote }),
  isSwapWrapToken: () => true,
  getRabbyFeeRate: () => '0',
}));
jest.mock('@/ui/views/Swap/hooks/twoStepSwap', () => ({ twoStepChains: [] }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockCloseSign = jest.fn();
const mockDexes = [DEX_ENUM.ONEINCH];
const mockQuote = jest.fn().mockResolvedValue({
  name: DEX_ENUM.ONEINCH,
  data: { toTokenAmount: '1000000000000000000', toTokenDecimals: 18 },
  preExecResult: { isSdkPass: true, gasUsdValue: 0, gasPrice: 1 },
});

test.each([false, true])(
  'SmallSwap own failure recovers unless cleared: %s',
  async (clearWhileSigning) => {
    const payToken = {
      id: 'eth',
      chain: 'eth',
      decimals: 18,
      raw_amount_hex_str: '0xde0b6b3a7640000',
      amount: 1,
      price: 1,
    };
    const options: any = {
      chain: { id: 1, enum: 'ETH', serverId: 'eth' },
      account: { address: '0xowner', type: KEYRING_CLASS.HARDWARE.LEDGER },
      receiveToken: { ...payToken, id: 'wrapped' },
    };
    const result = {
      txHash: '0xhash',
      preExecResult: { pre_exec: { success: true }, pre_exec_version: 'v0' },
    };
    let rejectTransport!: (error: Error) => void;
    mockSend
      .mockReset()
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectTransport = reject;
          })
      )
      .mockResolvedValue(result);
    let task!: ReturnType<typeof useBatchSwapTask>;
    function Harness() {
      task = useBatchSwapTask(options);
      return null;
    }
    const root = createRoot(document.createElement('div'));
    const errorLog = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await act(async () => root.render(React.createElement(Harness)));
      await act(async () => task.init([payToken] as any));
      await act(async () => {
        task.start();
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      if (clearWhileSigning) await act(async () => task.clear());
      await act(async () => {
        rejectTransport(new Error('DISCONNECTED'));
      });
      if (clearWhileSigning) {
        expect(task.status).toBe('idle');
        expect(task.list).toEqual([]);
        expect(task.hardwareError).toBeUndefined();
      } else {
        expect(task.status).toBe('paused');
        expect(task.hardwareError).toBe('DISCONNECTED');
        await act(async () => {
          task.continue();
        });
        expect(task.status).toBe('completed');
        expect(task.hardwareError).toBeUndefined();
        expect(task.statusDict.eth.status).toBe('success');
        expect(
          mockSend.mock.calls.map(([args]) => args.ignoreGasCheck)
        ).toEqual([true, true]);
      }
      expect(
        mockSend.mock.calls.every(([args]) => !('hardwareOperation' in args))
      ).toBe(true);
    } finally {
      await act(async () => root.unmount());
      errorLog.mockRestore();
      log.mockRestore();
    }
  }
);
