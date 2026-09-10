import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { useGnosisSubmission } from '@/ui/hooks/useGnosisSubmission';
import notificationService from '@/background/service/notification';
import { signingFlowService } from '@/background/service/signingFlow';
import { createApprovalActions } from '@/ui/approval/actions';
import { ApprovalPopupContainer } from '@/ui/views/Approval/components/Popup/ApprovalPopupContainer';
import WatchAddressProcess from '@/ui/views/Approval/components/WatchAddressWaiting/Process';
import { CHAINS_ENUM, WALLETCONNECT_STATUS_MAP } from '@/constant';
import { toApprovalRef, toSigningAttemptRef } from '@/utils/signingTypes';

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: { update: jest.fn() },
    storage: { local: { get: jest.fn().mockResolvedValue({}) } },
    tabs: { onCreated: { addListener: jest.fn() } },
    action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn() },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
    },
    runtime: { getManifest: () => ({ manifest_version: 3 }) },
  },
}));
jest.mock('background/webapi', () => ({
  winMgr: {
    event: { on: jest.fn() },
    openNotification: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/background/service/transactionHistory', () => ({
  __esModule: true,
  default: { removeAllSigningTx: jest.fn(), removeSigningTx: jest.fn() },
}));
jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: { getCurrentAccount: () => null },
}));
jest.mock('@/stats', () => ({
  __esModule: true,
  default: { report: jest.fn() },
}));
jest.mock('@sentry/browser', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('@/ui/utils/approval-popup', () => ({}));
jest.mock('@/ui/utils/useDeviceConnect', () => ({}));
jest.mock('@/ui/utils/WalletContext', () => ({}));
jest.mock('@/ui/utils', () => ({
  noop: () => undefined,
  useCommonPopupView: () => ({
    visible: true,
    setTitle: jest.fn(),
    setClassName: jest.fn(),
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/ui/component/WalletConnect/useDisplayBrandName', () => ({
  useDisplayBrandName: () => ['WALLETCONNECT'],
  WALLET_BRAND_NAME_KEY: {},
}));
jest.mock('@/ui/component/WalletConnect/useWalletConnectIcon', () => ({
  useWalletConnectIcon: () => '',
}));
jest.mock('@/ui/views/Approval/components/Popup/FooterResend', () => ({
  FooterResend: () => null,
}));
jest.mock('@/ui/views/Approval/components/Popup/FooterButton', () => ({
  FooterButton: () => null,
}));
jest.mock(
  '@/ui/views/Approval/components/Popup/FooterResendCancelGroup',
  () => ({
    FooterResendCancelGroup: () => null,
  })
);

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const waitingPages = [
  'PrivatekeyWaiting.tsx',
  'CommonWaiting.tsx',
  'LedgerHardwareWaiting.tsx',
  'ImKeyHardwareWaiting.tsx',
  'CoinbaseWaiting/index.tsx',
  'WatchAddressWaiting/index.tsx',
  'QRHardWareWaiting/QRHardWareWaiting.tsx',
];

// Exercise the actual waiting-page completion/retry handlers without hardware UI.
function handler(
  source: string,
  name: string,
  indent: number,
  dependencies: Record<string, unknown>
) {
  const declaration = source.match(
    new RegExp(`const ${name} = async [\\s\\S]*?\\n {${indent}}};`)
  )![0];
  const code = ts.transpileModule(declaration, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(...Object.keys(dependencies), `${code}; return ${name};`)(
    ...Object.values(dependencies)
  );
}

test.each([
  ...waitingPages.map((file) => ({
    file,
    isMessage: false,
    firstSubmission: false,
  })),
  { file: 'PrivatekeyWaiting.tsx', isMessage: false, firstSubmission: true },
  { file: 'PrivatekeyWaiting.tsx', isMessage: true, firstSubmission: true },
  { file: 'PrivatekeyWaiting.tsx', isMessage: true, firstSubmission: false },
])(
  '$file retries Safe submission (message=$isMessage, first=$firstSubmission)',
  async ({ file, isMessage, firstSubmission }) => {
    const source = readFileSync(
      resolve(__dirname, '../../src/ui/views/Approval/components', file),
      'utf8'
    );
    const verifiesPopup =
      file.startsWith('QRHardWareWaiting') ||
      file.startsWith('WatchAddressWaiting');
    const account = { address: 'signer', type: 'Ledger', brandName: 'Ledger' };
    const flow = signingFlowService.createFlow({
      flowId: 'safe-flow',
      origin: 'dapp',
      account,
      rpcRequestId: file,
    });
    const attempt = signingFlowService.createAttempt(flow)!;
    notificationService.notifiWindowId = 123;
    const settled = jest.fn();
    const approvalResult = notificationService
      .requestApproval(
        {
          approvalComponent: file.split(/[/.]/)[0],
          origin: 'dapp',
          account,
          isGnosis: true,
          params: {},
        },
        {},
        { signing: { flow, attempt } }
      )
      .then(settled, () => undefined);
    const approval = notificationService.getCurrentApproval()!;
    const owner = signingFlowService.run(
      flow,
      attempt,
      async () => 'signature'
    );
    signingFlowService.markUiReady(attempt);
    await owner;
    const context = {
      approval: toApprovalRef(approval.id, approval.data.approvalComponent),
      signing: { flow, attempt },
    };
    const attemptRef = { current: attempt };
    const signatures = firstSubmission ? [] : [{ data: 'existing' }];
    const submit = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue(undefined);
    const addSignature = jest.fn(async () => {
      signatures.push({ data: 'signature' });
    });
    const wallet = {
      isApprovalCurrent: jest.fn().mockResolvedValue(true),
      getGnosisTransactionSignatures: jest.fn(async () => [...signatures]),
      getGnosisMessageSignatures: jest.fn(async () => [...signatures]),
      gnosisAddConfirmation:
        !isMessage && !firstSubmission ? submit : jest.fn(),
      gnosisAddSignature: addSignature,
      postGnosisTransaction: !isMessage && firstSubmission ? submit : jest.fn(),
      addGnosisMessage: isMessage && firstSubmission ? submit : jest.fn(),
      addGnosisMessageSignature:
        isMessage && !firstSubmission ? submit : jest.fn(),
      resendSign: jest.fn().mockResolvedValue(undefined),
      setRetryTxType: jest.fn().mockResolvedValue(true),
    };
    const state = {
      errorMessage: '',
      connectError: null as unknown,
      connectStatus: 0,
      status: 0,
    };
    const setSignFinishedData = jest.fn();
    let gnosisSubmission!: ReturnType<typeof useGnosisSubmission>;
    const host = document.createElement('div');
    function Harness() {
      gnosisSubmission = useGnosisSubmission({
        wallet: wallet as any,
        attemptRef,
        isGnosis: true,
        isMessage,
        signerAddress: 'signer',
        onFinished: (data) => onFinished(data),
      });
      return null;
    }
    const root = createRoot(host);
    act(() => {
      root.render(React.createElement(Harness));
    });
    const noop = jest.fn();
    const dependencies = {
      wallet,
      attemptRef,
      gnosisSubmission,
      approvalScope: { approval: context.approval },
      getSigningContext: () => context,
      sameSigningAttempt: (a, b) => a?.attemptId === b?.attemptId,
      params: {
        isGnosis: true,
        safeMessage: isMessage,
        account: { address: 'signer' },
      },
      account: { address: 'signer' },
      adjustV: (_method, signature) => signature,
      setResult: noop,
      setConnectStatus: (value: number) => (state.connectStatus = value),
      setErrorMessage: (value: string) => (state.errorMessage = value),
      setConnectError: (value: unknown) => (state.connectError = value),
      setStatus: (value: number) => (state.status = value),
      WALLETCONNECT_STATUS_MAP,
      QRHARDWARE_STATUS: { DONE: 1, SYNC: 2 },
      connectStatus: 2,
      sessionStatus: 'CONNECTED',
      isSignText: false,
      isSignTextRef: { current: false },
      explainRef: { current: null },
      chain: {},
      ga4: { fireEvent: noop },
      matomoRequestEvent: noop,
      Sentry: { captureException: noop },
      console: { error: noop, log: noop },
      rejectApproval: noop,
      setSignFinishedData,
      txFailedResult: undefined,
      message: { success: noop },
      t: (key) => key,
      notifySigningUiReady: noop,
      handleRequestSignature: noop,
    };
    const onFinished = handler(source, 'onSignFinished', 4, dependencies);
    const retry = handler(source, 'handleRetry', 2, dependencies);
    const closePopup = jest.fn();
    const actions = createApprovalActions({
      approval: context.approval,
      account,
      isCurrent: async () => notificationService.isApprovalCurrent(approval.id),
      deviceConnect: async () => true,
      resolveApprovalFor: notificationService.resolveApprovalFor,
      rejectApprovalFor: notificationService.rejectApprovalFor,
      onResolved: noop,
      onRejected: noop,
    });
    const popupRoot = createRoot(document.createElement('div'));
    // Use the page's effect with real React state, the actual popup/Done timer,
    // and the real approval action and background settlement boundary.
    const completion = verifiesPopup
      ? ts.transpileModule(
          source.match(
            /(?:React\.)?useEffect\(\(\) => \{\n {4}if \(signFinishedData && isClickDone\) \{[\s\S]*?\}, \[signFinishedData, isClickDone\]\);/
          )![0],
          { compilerOptions: { target: ts.ScriptTarget.ES2020 } }
        ).outputText
      : '';
    const useCompletion = new Function(
      'React',
      'useEffect',
      'signFinishedData',
      'isClickDone',
      'resolveApproval',
      'closePopup',
      'stay',
      completion
    );
    function PopupHarness() {
      const [isClickDone, setIsClickDone] = React.useState(false);
      useCompletion(
        React,
        React.useEffect,
        setSignFinishedData.mock.calls[0]?.[0],
        isClickDone,
        actions.resolve,
        closePopup,
        false
      );
      const onDone = () => setIsClickDone(true);
      if (file.startsWith('WatchAddressWaiting')) {
        return React.createElement(WatchAddressProcess, {
          chain: CHAINS_ENUM.ETH,
          result: '',
          status: state.connectStatus,
          error: state.connectError as any,
          account,
          onRetry: retry,
          onCancel: noop,
          onDone,
        });
      }
      const projection = ts.transpileModule(
        source.match(
          /const popupStatus = React\.useMemo\([\s\S]*?\}, \[status, errorMessage\]\);/
        )![0],
        { compilerOptions: { target: ts.ScriptTarget.ES2020 } }
      ).outputText;
      const popupStatus = new Function(
        'React',
        'status',
        'errorMessage',
        'QRHARDWARE_STATUS',
        'setContent',
        't',
        projection + '; return popupStatus;'
      )(
        React,
        state.status,
        state.errorMessage,
        dependencies.QRHARDWARE_STATUS,
        noop,
        dependencies.t
      );
      return React.createElement(ApprovalPopupContainer, {
        hdType: 'qrcode',
        status: popupStatus,
        content: '',
        onDone,
      });
    }
    try {
      await gnosisSubmission.onFinished({
        attempt,
        success: true,
        data: 'signature',
      });
      expect(setSignFinishedData).not.toHaveBeenCalled();
      if (verifiesPopup) {
        jest.useFakeTimers();
        await act(async () =>
          popupRoot.render(React.createElement(PopupHarness))
        );
        await act(async () => {
          jest.advanceTimersByTime(500);
        });
        expect(settled).not.toHaveBeenCalled();
      }
      wallet.isApprovalCurrent.mockResolvedValue(false);
      await retry();
      expect(submit).toHaveBeenCalledTimes(1);
      expect(setSignFinishedData).not.toHaveBeenCalled();
      wallet.isApprovalCurrent.mockResolvedValue(true);
      await Promise.all([retry(), retry()]);
      expect(setSignFinishedData).toHaveBeenCalledWith(
        expect.objectContaining({ data: 'signature' })
      );
      expect(submit).toHaveBeenCalledTimes(2);
      expect(wallet.resendSign).not.toHaveBeenCalled();
      if (file.startsWith('QRHardWareWaiting')) {
        expect(state.errorMessage).toBe('');
      }
      if (file === 'WatchAddressWaiting/index.tsx') {
        expect(state.connectStatus).toBe(
          dependencies.WALLETCONNECT_STATUS_MAP.SUBMITTED
        );
        expect(state.connectError).toBeNull();
      }
      if (verifiesPopup) {
        await act(async () =>
          popupRoot.render(React.createElement(PopupHarness))
        );
        await act(async () => {
          jest.advanceTimersByTime(499);
        });
        expect(settled).not.toHaveBeenCalled();
        expect(notificationService.getCurrentApproval()?.id).toBe(approval.id);
        await act(async () => {
          jest.advanceTimersByTime(1);
        });
        await approvalResult;
        expect(settled).toHaveBeenCalledWith('signature');
        expect(settled).toHaveBeenCalledTimes(1);
        expect(closePopup).toHaveBeenCalledTimes(1);
        expect(notificationService.getCurrentApproval()).toBeNull();
        expect(signingFlowService.getFlow(flow)).toBeUndefined();
      }
      attemptRef.current = toSigningAttemptRef('safe-flow', 'next');
      await expect(
        gnosisSubmission.submit('signature', context)
      ).rejects.toThrow('Signing approval is no longer current');
      expect(submit).toHaveBeenCalledTimes(2);
      expect(addSignature).toHaveBeenCalledTimes(
        !isMessage && firstSubmission ? 1 : 0
      );
    } finally {
      act(() => {
        root.unmount();
        popupRoot.unmount();
      });
      jest.useRealTimers();
      notificationService.rejectAllApprovals();
      await approvalResult;
    }
  }
);
