import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

const mockCancelOneKeySigning = jest.fn().mockResolvedValue(undefined);
const mockOpenInternalPageInTab = jest.fn();
const mockSendTransaction = jest.fn();
const mockSendTransactionByMiniSignV2 = jest.fn();
const mockSendPersonalMessage = jest.fn();
const mockSendSignTypedData = jest.fn();
const mockSetRetryTxRecommendNonce = jest.fn().mockResolvedValue(undefined);
const mockRetryTxReset = jest.fn().mockResolvedValue(undefined);

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('i18next', () => ({
  t: (key: string) => key,
}));
jest.mock('consts', () => ({
  ALIAS_ADDRESS: {},
  CAN_ESTIMATE_L1_FEE_CHAINS: [],
  CHAINS_ENUM: { ETH: 'ETH' },
  DEFAULT_GAS_LIMIT_BUFFER: 0.95,
  DEFAULT_GAS_LIMIT_RATIO: 1.5,
  GASPRICE_RANGE: {},
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  KEYRING_CLASS: {
    PRIVATE_KEY: 'Simple Key Pair',
    HARDWARE: {
      ONEKEY: 'Onekey Hardware',
      LEDGER: 'Ledger Hardware',
    },
  },
  KEYRING_TYPE: { HdKeyring: 'HD' },
  MINIMUM_GAS_LIMIT: 21000,
  SAFE_GAS_LIMIT_BUFFER: 0.95,
  SAFE_GAS_LIMIT_RATIO: 1,
  SUPPORT_1559_KEYRING_TYPE: [],
}));
jest.mock('@/constant', () => ({
  KEYRING_CLASS: {
    PRIVATE_KEY: 'Simple Key Pair',
    HARDWARE: {
      ONEKEY: 'Onekey Hardware',
      LEDGER: 'Ledger Hardware',
    },
  },
}));
jest.mock('@/utils/chain', () => ({
  findChain: () => ({ id: 1, enum: 'ETH', serverId: 'eth' }),
  isTestnet: () => false,
}));
jest.mock('@/utils/tempo', () => ({
  isTempoChain: () => false,
  shouldUseTempoTransaction: () => false,
}));
jest.mock('@/ui/views/Approval/components/SignTx', () => ({
  normalizeTxParams: (tx: any) => tx,
}));
jest.mock('@/ui/utils/sendTransaction', () => ({
  sendTransaction: (...args: any[]) => mockSendTransaction(...args),
  sendTransactionByMiniSignV2: (...args: any[]) =>
    mockSendTransactionByMiniSignV2(...args),
}));
jest.mock('@/ui/utils/sendPersonalMessage', () => ({
  sendPersonalMessage: (...args: any[]) => mockSendPersonalMessage(...args),
}));
jest.mock('@/ui/utils/sendTypedData', () => ({
  sendSignTypedData: (...args: any[]) => mockSendSignTypedData(...args),
}));
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({
  useSetDirectSigning: () => jest.fn(),
}));
jest.mock('@rabby-wallet/rabby-action', () => ({}));
jest.mock('@/ui/state/exchange', () => ({}));
jest.mock('@/ui/component/AuthenticationModal', () => ({}));
jest.mock('@/ui/utils/ledger', () => ({
  isLedgerConnectionRecoverableError: () => false,
  isLedgerLockError: () => false,
}));
jest.mock('@/ui/utils', () => ({
  openInternalPageInTab: (...args: any[]) => mockOpenInternalPageInTab(...args),
  useWallet: () => ({
    cancelOneKeySigning: mockCancelOneKeySigning,
    getRetryTxType: jest.fn().mockResolvedValue('nonce'),
    retryTxReset: mockRetryTxReset,
    getRetryTxRecommendNonce: jest.fn(),
    setRetryTxRecommendNonce: mockSetRetryTxRecommendNonce,
  }),
}));

import { isOneKeyDisconnectError } from '@/ui/utils/onekey';
import { SignatureSteps } from '@/ui/component/MiniSignV2/services/SignatureSteps';
import { useCancelOneKeySigningOnClose } from '@/ui/hooks/useCancelOneKeySigningOnClose';
import { useBatchSignTxTask } from '@/ui/views/Approval/components/MiniSignTx/useBatchSignTxTask';
import { useBatchSignPersonalMessageTask } from '@/ui/views/Approval/components/MiniPersonalMessgae/useBatchPersonalMessageTask';
import { useBatchSignTypedDataTask } from '@/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask';

describe('OneKey disconnect error helper (C2)', () => {
  test.each([
    ['105: Device not found', true],
    ['901: Device not found or needs WebUSB permission', true],
    ['107: OneKey connection was interrupted.', true],
    ['109: OneKey connection was interrupted.', true],
    ['No OneKey Device found', true],
    ['DISCONNECTED', true],
    [{ code: HardwareErrorCode.DeviceNotFound }, true],
    [{ code: HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission }, true],
    [{ code: HardwareErrorCode.DeviceInterruptedFromOutside }, true],
    [{ code: HardwareErrorCode.DeviceInterruptedFromUser }, true],
    [{ errorCode: '105' }, true],
    [Object.assign(new Error('raw error'), { code: 109 }), true],
    [new Error('105: Device not found'), true],
    ['802: Operation cancelled', false],
    ['113: Passphrase is turned off', false],
    [{ code: 802, message: 'Operation cancelled' }, false],
    ['', false],
    [null, false],
    [undefined, false],
  ])('isOneKeyDisconnectError(%p) === %s', (input, expected) => {
    expect(isOneKeyDisconnectError(input)).toBe(expected);
  });

  test('SignatureSteps.sendBatch skips setRetryTxRecommendNonce on OneKey disconnect codes and bumps on other failures', async () => {
    const setRetryTxRecommendNonce = jest.fn().mockResolvedValue(undefined);
    const wallet: any = {
      getRetryTxType: jest.fn().mockResolvedValue('nonce'),
      retryTxReset: jest.fn().mockResolvedValue(undefined),
      getRetryTxRecommendNonce: jest.fn(),
      setRetryTxRecommendNonce,
    };
    const baseParams: any = {
      wallet,
      chainServerId: 'eth',
      account: { address: '0xsender', type: 'Onekey Hardware' },
      txsCalc: [
        {
          tx: { from: '0xsender', chainId: 1, nonce: '0x1' },
          preExecResult: {},
        },
      ],
    };

    for (const msg of [
      '105: Device not found',
      '901: Device not found or needs WebUSB permission',
      '107: OneKey connection was interrupted.',
      '109: OneKey connection was interrupted.',
      'No OneKey Device found',
    ]) {
      mockSendTransactionByMiniSignV2.mockRejectedValueOnce(new Error(msg));
      await SignatureSteps.sendBatch(baseParams);
      expect(setRetryTxRecommendNonce).not.toHaveBeenCalled();
    }

    mockSendTransactionByMiniSignV2.mockRejectedValueOnce(
      Object.assign(new Error('Disconnected'), { code: 105 })
    );
    await SignatureSteps.sendBatch(baseParams);
    expect(setRetryTxRecommendNonce).not.toHaveBeenCalled();

    mockSendTransactionByMiniSignV2.mockRejectedValueOnce(
      new Error('insufficient funds')
    );
    await SignatureSteps.sendBatch(baseParams);
    expect(setRetryTxRecommendNonce).toHaveBeenCalledTimes(1);
  });

  test('MiniSign task hooks take disconnect path without nonce bump or generic error', async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root = createRoot(container);
    let txTask!: ReturnType<typeof useBatchSignTxTask>;
    let msgTask!: ReturnType<typeof useBatchSignPersonalMessageTask>;
    let typedTask!: ReturnType<typeof useBatchSignTypedDataTask>;

    const Harness = () => {
      txTask = useBatchSignTxTask({});
      msgTask = useBatchSignPersonalMessageTask({});
      typedTask = useBatchSignTypedDataTask({});
      return null;
    };

    try {
      jest.clearAllMocks();
      act(() => {
        root.render(React.createElement(Harness));
      });
      act(() => {
        txTask.init([
          {
            tx: { from: '0xsender', chainId: 1, nonce: '0x1' } as any,
            options: {} as any,
            status: 'idle',
          },
        ]);
        msgTask.init([
          {
            tx: { data: ['0x01', '0xsender'] },
            status: 'idle',
          },
        ]);
        typedTask.init([
          {
            tx: { data: {}, from: '0xsender', version: 'V4' },
            status: 'idle',
          },
        ]);
      });

      mockSendTransaction.mockRejectedValueOnce(
        new Error('105: Device not found')
      );
      await act(async () => {
        await expect(txTask.start()).rejects.toThrow('105: Device not found');
      });
      expect(mockSetRetryTxRecommendNonce).not.toHaveBeenCalled();
      expect(txTask.error).toBe('');

      mockSendPersonalMessage.mockRejectedValueOnce(
        new Error('107: OneKey connection was interrupted.')
      );
      await act(async () => {
        await expect(msgTask.start()).rejects.toThrow('107:');
      });
      expect(msgTask.error).toBe('');

      mockSendSignTypedData.mockRejectedValueOnce(
        new Error('109: OneKey connection was interrupted.')
      );
      await act(async () => {
        await expect(typedTask.start()).rejects.toThrow('109:');
      });
      expect(typedTask.error).toBe('');
    } finally {
      act(() => root.unmount());
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
    }
  });
});

describe('useCancelOneKeySigningOnClose (C10)', () => {
  let container: HTMLDivElement;
  let root: Root;

  const Probe = (
    props: Parameters<typeof useCancelOneKeySigningOnClose>[0]
  ) => {
    useCancelOneKeySigningOnClose(props);
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  });

  test('cancels active OneKey signing on unmount and once on beforeunload', () => {
    act(() => {
      root.render(
        React.createElement(Probe, {
          accountType: 'Onekey Hardware',
          address: '0xonekey',
          active: true,
        })
      );
    });
    expect(mockCancelOneKeySigning).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    expect(mockCancelOneKeySigning).toHaveBeenCalledTimes(1);
    expect(mockCancelOneKeySigning).toHaveBeenCalledWith('0xonekey');

    mockCancelOneKeySigning.mockClear();
    root = createRoot(container);
    act(() => {
      root.render(
        React.createElement(Probe, {
          accountType: 'Onekey Hardware',
          address: '0xonekey',
          active: true,
        })
      );
    });
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(mockCancelOneKeySigning).toHaveBeenCalledTimes(1);
    expect(mockCancelOneKeySigning).toHaveBeenCalledWith('0xonekey');

    act(() => {
      root.unmount();
    });
    expect(mockCancelOneKeySigning).toHaveBeenCalledTimes(1);
  });

  test('does not cancel when idle or for non-OneKey accounts', () => {
    act(() => {
      root.render(
        React.createElement(Probe, {
          accountType: 'Onekey Hardware',
          address: '0xonekey',
          active: false,
        })
      );
    });
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
      root.unmount();
    });
    expect(mockCancelOneKeySigning).not.toHaveBeenCalled();

    root = createRoot(container);
    act(() => {
      root.render(
        React.createElement(Probe, {
          accountType: 'Ledger Hardware',
          address: '0xledger',
          active: true,
        })
      );
    });
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
      root.unmount();
    });
    expect(mockCancelOneKeySigning).not.toHaveBeenCalled();
  });
});
