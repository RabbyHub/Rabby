import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { toSigningAttemptRef } from '@/utils/signingTypes';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

const mockWallet = { approveToken: jest.fn(async () => ({ params: [{}] })) };
jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/views/GasAccount/hooks', () => ({
  useGasAccountSign: () => undefined,
}));
jest.mock('@/ui/hooks/backgroundState/useAccount', () => ({
  useCurrentAccount: () => ({ type: 'Ledger Hardware' }),
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
jest.mock('@/ui/utils/sendTransaction', () => ({
  sendTransaction: jest.fn(),
  FailedCode: {
    GasTooHigh: 'GasTooHigh',
    DefaultFailed: 'DefaultFailed',
    SubmitTxFailed: 'SubmitTxFailed',
  },
}));
jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
let mockLedgerStatus = 'CONNECTED';
jest.mock('@/ui/component/ConnectStatus/useLedgerStatus', () => ({
  useLedgerStatus: () => ({ status: mockLedgerStatus }),
}));
let mockOneKeyStatus = 'CONNECTED';
jest.mock('@/ui/component/ConnectStatus/useOneKeyStatus', () => ({
  useOneKeyStatus: () => ({
    status: mockOneKeyStatus,
    checkStatus: async () => true,
  }),
}));
jest.mock('@/ui/views/Approval/components/FooterBar/CommonAccount', () => ({
  CommonAccount: ({ children }) => children,
}));
jest.mock('@/ui/views/Approval/components/Popup/Dots', () => ({
  Dots: () => null,
}));
jest.mock('@/ui/views/CommonPopup/Ledger', () => ({
  Ledger: () => 'ledger-recovery',
}));
jest.mock('@/ui/views/CommonPopup/OneKey', () => ({
  OneKey: () => 'onekey-recovery',
}));
jest.mock('@/ui/component', () => ({
  Modal: ({ visible, children }) => (visible ? children : null),
  Popup: ({ visible, open, children }) => (visible || open ? children : null),
}));
jest.mock('antd', () => ({ Button: ({ children }) => children }));

import { sendTransaction } from '@/ui/utils/sendTransaction';
import { useBatchRevokeTask as useDesktopTask } from '@/ui/views/DesktopProfile/components/ApprovalsTabPane/components/BatchRevoke/useBatchRevokeTask';
import { RevokeActionLedgerButton as DesktopLedgerButton } from '@/ui/views/DesktopProfile/components/ApprovalsTabPane/components/BatchRevoke/RevokeActionLedgerButton';
import { useBatchRevokeTask as useManageTask } from '@/ui/views/ManageBatchApprovals/hooks/useBatchRevokeTask';
import { RevokeActionLedgerButton as ManageLedgerButton } from '@/ui/views/ManageBatchApprovals/components/RevokeActionButton/RevokeActionLedgerButton';
import { RevokeActionOnekeyButton } from '@/ui/views/ManageBatchApprovals/components/RevokeActionButton/RevokeActionOnekeyButton';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pages = [
  {
    page: 'DesktopProfile',
    useTask: useDesktopTask,
    Button: DesktopLedgerButton,
  },
  {
    page: 'ManageBatchApprovals',
    useTask: useManageTask,
    Button: ManageLedgerButton,
  },
] as const;

it.each(pages)(
  '$page recovers a locked Ledger during Still Revoke after the batch went idle',
  async ({ useTask, Button }) => {
    const send = jest.mocked(sendTransaction);
    send.mockReset();
    mockLedgerStatus = 'CONNECTED';
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const host = document.createElement('div');
    const root = createRoot(host);
    let task!: ReturnType<typeof useTask>;
    function Harness() {
      task = useTask();
      return React.createElement(Button as React.ComponentType<any>, {
        task: task as any,
        onDone: () => undefined,
      });
    }
    const item = {
      id: 'token',
      $assetParent: { id: 'token' },
      $assetContract: {},
      $assetToken: {},
    } as any;
    try {
      await act(async () => root.render(React.createElement(Harness)));
      await act(async () =>
        task.init([item], [
          { id: 'token', spender: 'spender', chainServerId: 'eth' },
        ] as any)
      );
      send.mockRejectedValueOnce(
        Object.assign(new Error('gas too high'), { name: 'GasTooHigh' })
      );
      await act(async () => {
        task.start();
      });
      expect(task.status).toBe('completed');
      expect(task.list[0].$status).toMatchObject({
        status: 'fail',
        failedCode: 'GasTooHigh',
      });

      let finishRetry!: () => void;
      send.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            finishRetry = () => {
              reject(new Error('0x5515'));
            };
          })
      );
      let retry!: Promise<unknown>;
      await act(async () => {
        retry = task.addRevokeTask(item, 0, true);
      });
      // A dApp error must not trigger recovery in this direct signing task.
      await act(async () => {
        eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, {
          attempt: toSigningAttemptRef('dapp', 'attempt'),
          errorMsg: '0x5515',
        });
      });
      expect(host.textContent).not.toContain('ledger-recovery');
      await act(async () => {
        finishRetry();
        await retry;
      });
      expect(host.textContent).toContain('ledger-recovery');
      expect(task.status).toBe('paused');
      expect(send.mock.calls[1][0].ignoreGasCheck).toBe(true);

      send.mockResolvedValueOnce({ txHash: 'hash' } as any);
      await act(async () => {
        task.continue();
      });
      expect(send).toHaveBeenCalledTimes(3);
      // Hardware recovery continues to recheck gas, as before.
      expect(send.mock.calls[2][0].ignoreGasCheck).toBe(false);
      expect(task.list[0].$status).toMatchObject({
        status: 'success',
        txHash: 'hash',
      });
      expect(task.status).toBe('completed');
    } finally {
      await act(async () => root.unmount());
      log.mockRestore();
    }
  }
);

describe.each(pages)('$page local recovery', ({ useTask, Button }) => {
  const item = {
    id: 'token',
    $assetParent: { id: 'token' },
    $assetContract: {},
    $assetToken: {},
  } as any;
  const revokeList = [
    { id: 'token', spender: 'spender', chainServerId: 'eth' },
  ] as any;
  const send = jest.mocked(sendTransaction);
  let task: ReturnType<typeof useTask>;
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let log: jest.SpyInstance;
  function Harness() {
    task = useTask();
    return React.createElement(Button as React.ComponentType<any>, {
      task,
      onDone: () => undefined,
    });
  }

  beforeEach(async () => {
    send.mockReset();
    mockLedgerStatus = 'CONNECTED';
    log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    host = document.createElement('div');
    root = createRoot(host);
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => task.init([item], revokeList));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    log.mockRestore();
  });

  it('pauses before the queue can submit the next row', async () => {
    const nextItem = { ...item, id: 'next' };
    await act(async () => task.init([item, nextItem], revokeList));
    send.mockRejectedValueOnce(new Error('0x5515'));
    await act(async () => task.start());
    expect(send).toHaveBeenCalledTimes(1);
    expect(task.status).toBe('paused');
    expect(host.textContent).toContain('ledger-recovery');

    send.mockResolvedValue({ txHash: 'hash' } as any);
    await act(async () => task.continue());
    expect(send).toHaveBeenCalledTimes(3);
    expect(task.list.every((row) => row.$status?.status === 'success')).toBe(
      true
    );
  });

  it('does not submit a transaction whose preparation finished after reset', async () => {
    let finish!: () => void;
    mockWallet.approveToken.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ params: [{}] });
        })
    );
    await act(async () => task.start());
    await act(async () => task.init([item], revokeList));
    await act(async () => finish());
    expect(send).not.toHaveBeenCalled();
    expect(task.status).toBe('idle');
    expect(task.list[0].$status).toBeUndefined();
  });

  it.each(['success', 'error'])(
    'ignores progress and %s from a replaced run',
    async (outcome) => {
      let settle!: () => void;
      send.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            settle = () =>
              outcome === 'success'
                ? resolve({ txHash: 'old' } as any)
                : reject(new Error('0x5515'));
          })
      );
      await act(async () => task.start());
      const oldSubmission = send.mock.calls[0][0];
      await act(async () => task.init([item], revokeList));
      await act(async () => {
        oldSubmission.onProgress?.('signed');
        oldSubmission.onUseGasAccount?.();
        settle();
      });
      expect(task.status).toBe('idle');
      expect(task.txStatus).toBe('idle');
      expect(task.list[0].$status).toBeUndefined();
      expect(host.textContent).not.toContain('ledger-recovery');
      expect(send).toHaveBeenCalledTimes(1);
    }
  );

  it('ignores another dApp error while its completed window remains mounted', async () => {
    send.mockResolvedValueOnce({ txHash: 'hash' } as any);
    await act(async () => task.start());
    expect(task.status).toBe('completed');
    await act(async () => {
      eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, {
        attempt: toSigningAttemptRef('dapp', 'attempt'),
        errorMsg: '0x5515',
      });
    });
    expect(task.status).toBe('completed');
    expect(host.textContent).not.toContain('ledger-recovery');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('handles a device disconnect locally without emitting a signing error', async () => {
    let finish!: () => void;
    send.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ txHash: 'hash' } as any);
        })
    );
    const otherWindow = jest.fn();
    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, otherWindow);
    try {
      await act(async () => task.start());
      mockLedgerStatus = 'DISCONNECTED';
      await act(async () => root.render(React.createElement(Harness)));
      expect(task.status).toBe('paused');
      expect(host.textContent).toContain('ledger-recovery');
      expect(otherWindow).not.toHaveBeenCalled();
      await act(async () => finish());
    } finally {
      eventBus.removeEventListener(
        EVENTS.COMMON_HARDWARE.REJECTED,
        otherWindow
      );
    }
  });
});

it.each(['submission-error', 'device-disconnect'])(
  'handles OneKey %s through the local task',
  async (scenario) => {
    const send = jest.mocked(sendTransaction);
    send.mockReset();
    mockOneKeyStatus = 'CONNECTED';
    const host = document.createElement('div');
    const root = createRoot(host);
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const otherWindow = jest.fn();
    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, otherWindow);
    let task!: ReturnType<typeof useManageTask>;
    function Harness() {
      task = useManageTask();
      return React.createElement(RevokeActionOnekeyButton, { task });
    }
    const item = { id: 'token', $assetParent: { id: 'token' } } as any;
    let finish!: () => void;
    send.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          finish = () =>
            scenario === 'submission-error'
              ? reject(new Error('901: device disconnected'))
              : resolve({ txHash: 'hash' } as any);
        })
    );
    try {
      await act(async () => root.render(React.createElement(Harness)));
      await act(async () =>
        task.init([item], [{ id: 'token', chainServerId: 'eth' }] as any)
      );
      await act(async () => task.start());
      if (scenario === 'submission-error') {
        await act(async () => finish());
      } else {
        mockOneKeyStatus = 'DISCONNECTED';
        await act(async () => root.render(React.createElement(Harness)));
        expect(task.status).toBe('paused');
        await act(async () => finish());
      }
      expect(host.textContent).toContain('onekey-recovery');
      expect(otherWindow).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      log.mockRestore();
      eventBus.removeEventListener(
        EVENTS.COMMON_HARDWARE.REJECTED,
        otherWindow
      );
    }
  }
);
