import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { useGnosisSubmission } from '@/ui/hooks/useGnosisSubmission';
import {
  toApprovalRef,
  toSigningAttemptRef,
  toSigningFlowRef,
} from '@/utils/signingTypes';

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
    const attempt = toSigningAttemptRef('safe-flow', 'signed');
    const context = {
      approval: toApprovalRef('safe-approval', 'PrivatekeyWaiting'),
      signing: { flow: toSigningFlowRef('safe-flow'), attempt },
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
      setConnectStatus: noop,
      setErrorMessage: noop,
      setConnectError: noop,
      setStatus: noop,
      WALLETCONNECT_STATUS_MAP: {
        SUBMITTED: 1,
        FAILED: 2,
        SUBMITTING: 3,
        WAITING: 4,
      },
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
    try {
      await gnosisSubmission.onFinished({
        attempt,
        success: true,
        data: 'signature',
      });
      expect(setSignFinishedData).not.toHaveBeenCalled();
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
      });
    }
  }
);
