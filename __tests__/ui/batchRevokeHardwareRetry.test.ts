import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { emitHardwareOperationRejected } from '@/utils/signEvent';

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
jest.mock('@/ui/component/ConnectStatus/useLedgerStatus', () => ({
  useLedgerStatus: () => ({ status: 'CONNECTED' }),
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

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each([
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
])(
  '$page recovers a locked Ledger during Still Revoke after the batch went idle',
  async ({ useTask, Button }) => {
    const send = jest.mocked(sendTransaction);
    send.mockReset();
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
      const previousOperation = send.mock.calls[0][0].hardwareOperation!;
      expect(task.hardwareOperationRef.current).toBeUndefined();

      let finishRetry!: () => void;
      send.mockImplementationOnce(
        ({ hardwareOperation }) =>
          new Promise((_, reject) => {
            finishRetry = () => {
              emitHardwareOperationRejected(hardwareOperation!, '0x5515');
              reject(new Error('0x5515'));
            };
          })
      );
      let retry!: Promise<unknown>;
      await act(async () => {
        retry = task.addRevokeTask(item, 0, true);
      });
      // The old batch must not be allowed to trigger recovery in the retry.
      await act(async () => {
        emitHardwareOperationRejected(previousOperation, '0x5515');
      });
      expect(host.textContent).not.toContain('ledger-recovery');
      await act(async () => {
        finishRetry();
        await retry;
      });
      expect(host.textContent).toContain('ledger-recovery');
      expect(task.status).toBe('paused');
      const retryOperation = send.mock.calls[1][0].hardwareOperation!;
      expect(retryOperation).toEqual(task.hardwareOperationRef.current);
      expect(retryOperation).not.toEqual(previousOperation);
      expect(send.mock.calls[1][0].ignoreGasCheck).toBe(true);

      send.mockResolvedValueOnce({ txHash: 'hash' } as any);
      await act(async () => {
        task.continue();
      });
      expect(send).toHaveBeenCalledTimes(3);
      expect(send.mock.calls[2][0].hardwareOperation).toEqual(retryOperation);
      expect(task.list[0].$status).toMatchObject({
        status: 'success',
        txHash: 'hash',
      });
      expect(task.status).toBe('completed');
      expect(task.hardwareOperationRef.current).toBeUndefined();
    } finally {
      await act(async () => root.unmount());
      log.mockRestore();
    }
  }
);
