import React, { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { KEYRING_CLASS } from '@/constant';
import { emitHardwareOperationRejected } from '@/utils/signEvent';
import { toSigningAttemptRef } from '@/utils/signingTypes';
import { useSigningAttemptEvents } from '@/ui/hooks/useSigningAttemptEvents';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2/state/TypedDataSignatureManager';

jest.mock('@/ui/utils', () => ({ hasConnectedLedgerDevice: async () => true }));
jest.mock('@/ui/component/MiniSignV2/state/SignatureManager', () => ({
  MINI_SIGN_ERROR: { USER_CANCELLED: 'cancelled' },
}));
jest.mock('@/ui/component/MiniSignV2/services', () => ({ SignatureSteps: {} }));
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({
  supportedHardwareDirectSign: () => true,
}));
jest.mock('@/ui/utils/ledger', () => ({
  isLedgerLockError: (s: string) => s.includes('0x5515'),
}));
jest.mock('@/ui/utils/sendTypedData', () => ({
  sendSignTypedData: async ({ hardwareOperation }) => {
    emitHardwareOperationRejected(
      {
        kind: 'signing-attempt',
        attempt: toSigningAttemptRef('other-flow', 'other-attempt'),
      },
      '0x5515'
    );
    emitHardwareOperationRejected(hardwareOperation, '0x5515');
    throw new Error('0x5515');
  },
}));

// Exercise the actual UI adapters without mounting their visual dependencies.
const source = (path: string) =>
  readFileSync(
    resolve(__dirname, '../../src/ui/views/Approval/components', path),
    'utf8'
  );
const taskCode = source('MiniSignTypedData/MiniTypedDataApprovalV2.tsx').match(
  /const task = \{[\s\S]*?\} as any;/
)![0];
const compile = (code: string) =>
  ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test.each(['MiniLedgerAction', 'MiniOneKeyAction'])(
  '%s receives the V2 attempt even before another render',
  async (component) => {
    const listenerCode = source(`MiniSignTx/${component}.tsx`).match(
      /const attemptRef = [\s\S]*?useSigningAttemptEvents\(attemptRef, \{[\s\S]*?\}\);/
    )![0];
    const attempt = toSigningAttemptRef('typed-data', 'attempt');
    const wallet = {
      startDirectSigning: jest.fn().mockResolvedValue({ attempt }),
      finishDirectSigning: jest.fn().mockResolvedValue({ accepted: true }),
      cancelDirectSigning: jest.fn().mockResolvedValue(undefined),
    };
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
        'useRef',
        'useSigningAttemptEvents',
        'task',
        'handleHardwareError',
        compile(listenerCode)
      )(React, useRef, useSigningAttemptEvents, task, recover);
      return null;
    }
    const root = createRoot(document.createElement('div'));
    let pending: Promise<unknown> | undefined;
    try {
      await act(async () => root.render(React.createElement(Harness)));
      await act(async () => {
        pending = typedDataSignatureStore
          .start({
            wallet: wallet as any,
            config: {
              mode: 'DIRECT',
              account: {
                address: '0x123',
                type: KEYRING_CLASS.HARDWARE.LEDGER,
                brandName: 'Ledger',
              },
            },
            txs: [{ from: '0x123', data: {}, version: 'V4' }],
          })
          .catch(() => undefined);
      });
      expect(recover).toHaveBeenCalledWith('0x5515', attempt);
      expect(recover).toHaveBeenCalledTimes(1);
      recover.mockClear();
      emitHardwareOperationRejected(
        { kind: 'signing-attempt', attempt },
        'late error'
      );
      expect(recover).not.toHaveBeenCalled();
    } finally {
      typedDataSignatureStore.close();
      await pending;
      await act(async () => root.unmount());
    }
  }
);
