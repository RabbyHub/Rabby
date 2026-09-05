import React, { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import eventBus from '@/eventBus';
import { EVENTS, KEYRING_CLASS } from '@/constant';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { useBatchSignTypedDataTask } from '@/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask';
import { useSigningAttemptEvents } from '@/ui/hooks/useSigningAttemptEvents';
import { toSigningAttemptRef } from '@/utils/signingTypes';
import type { SigningAttemptRef } from '@/utils/signingTypes';

jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({
  supportedHardwareDirectSign: () => true,
  useSetDirectSigning: () => jest.fn(),
}));
jest.mock('@/ui/utils/sendPersonalMessage', () => ({
  sendPersonalMessage: (...args) => mockSend(...args),
}));
jest.mock('@/ui/utils/sendTypedData', () => ({
  sendSignTypedData: (...args) => mockSend(...args),
}));

const mockSend = jest.fn();
const mockWallet = {
  startDirectSigning: jest.fn(),
  cancelDirectSigning: jest.fn().mockResolvedValue(undefined),
  finishDirectSigning: jest.fn().mockResolvedValue({ accepted: true }),
};

// Jest's repository transform excludes TSX; compile the complete hook module.
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

test.each([
  ['personal-sign', useBatchSignPersonalMessageTask],
  ['typed-data', useBatchSignTypedDataTask],
] as const)(
  '%s routes only its active hardware error to recovery',
  async (_, useTask) => {
    const account = { address: '0x123', type: KEYRING_CLASS.HARDWARE.LEDGER };
    const attempt = toSigningAttemptRef('message-flow', 'attempt');
    const context = { account, attempt };
    mockWallet.startDirectSigning.mockResolvedValue(context);
    mockWallet.cancelDirectSigning.mockClear();
    let finishTransport!: () => void;
    mockSend.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishTransport = () => resolve({ txHash: 'signature' });
        })
    );
    let task!: {
      init: (items: any[]) => void;
      start: () => Promise<unknown>;
      stop: () => void;
      signingAttempt?: SigningAttemptRef;
    };
    const recover = jest.fn(() => task.stop());
    function Harness() {
      // The shared MiniFooterBar consumes both message tasks as the same task.
      task = useTask();
      const attemptRef = useRef<SigningAttemptRef>();
      attemptRef.current = task.signingAttempt;
      useSigningAttemptEvents(attemptRef, { onHardwareError: recover });
      return null;
    }
    const root = createRoot(document.createElement('div'));
    let pending: Promise<unknown> | undefined;
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      await act(async () => root.render(React.createElement(Harness)));
      await act(async () =>
        task.init([
          {
            tx: { data: ['message', account.address] },
            options: { account },
            status: 'idle',
          },
        ])
      );
      await act(async () => {
        pending = task.start().catch(() => undefined);
      });
      const emit = (eventAttempt: SigningAttemptRef) =>
        eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, {
          operation: { kind: 'signing-attempt', attempt: eventAttempt },
          errorMsg: 'DISCONNECTED',
        });
      await act(async () =>
        emit(toSigningAttemptRef('other-flow', 'other-attempt'))
      );
      expect(recover).not.toHaveBeenCalled();
      await act(async () => emit(attempt));
      expect(recover).toHaveBeenCalledTimes(1);
      expect(mockWallet.cancelDirectSigning).toHaveBeenCalledWith(context);
      expect(task.signingAttempt).toBeUndefined();
      await act(async () => emit(attempt));
      expect(recover).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => {
        finishTransport?.();
        await pending;
      });
      await act(async () => root.unmount());
      log.mockRestore();
    }
  }
);
