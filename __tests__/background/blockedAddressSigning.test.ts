import 'reflect-metadata';
import SimpleKeyring from '@rabby-wallet/eth-simple-keyring';
import {
  ApprovalRes,
  buildSignTx,
  normalizeTxParams,
} from '@/utils/transaction';
import { buildTempoTransaction, TempoTxCall } from '@/utils/tempo';
import providerController from '@/background/controller/provider/controller';
import {
  keyringService,
  openapiService as transactionOpenapi,
  RPCService,
  transactionHistoryService,
} from 'background/service';
import openapiService from '@/background/service/openapi';
import { clearBlockedAddressCache } from '@/background/service/blockedAddress';
import { isUserCancelledSigningError } from '@/background/utils/signingCancellation';

const from = '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf';
const to = '0x20c0000000000000000000000000000000000000';
const other = '0x1111111111111111111111111111111111111111';
const data = `0xa9059cbb${'dead'.padStart(64, '0')}${'2710'.padStart(64, '0')}`;
const keyring = new SimpleKeyring(['1'.padStart(64, '0')]);
const stopAfterSigning = new Error('stop before broadcast');
let mockSigningTx: { rawTx: object } | undefined;

jest.mock('background/service', () => ({
  keyringService: {
    keyrings: [],
    isUnlocked: jest.fn(() => true),
    getKeyringForAccount: jest.fn(async () => keyring),
    signTransaction: jest.fn(async () => {
      throw stopAfterSigning;
    }),
  },
  i18n: { t: (key: string) => key },
  transactionHistoryService: {
    getSigningTx: () => mockSigningTx,
    wasSigningTxUserCancelled: jest.fn(() => false),
    updateSigningTx: jest.fn(),
    addSubmitFailedTransaction: jest.fn(),
  },
  RPCService: {
    probeBestRPC: jest.fn(),
    hasCustomRPC: jest.fn(() => false),
    getDefaultRPC: jest.fn(() => ({ txPushToRPC: true })),
    getDefaultRPCByChainServerId: jest.fn(() => ({})),
    defaultRPCSubmitTxWithFallback: jest.fn(),
  },
  openapiService: { submitTxV2: jest.fn() },
}));
jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: { isBlockedAddress: jest.fn() },
}));
jest.mock('consts', () => ({
  KEYRING_TYPE: { SimpleKeyring: 'Simple Key Pair', HdKeyring: 'HD Key Tree' },
  KEYRING_CATEGORY_MAP: {},
  GASPRICE_RANGE: {},
  EVENTS: { COMMON_HARDWARE: { REJECTED: 'REJECTED' } },
}));
jest.mock('@/utils/chain', () => {
  const chain = { id: 4217, serverId: 'tempo', enum: 'TEMPO' };
  return { findChain: () => chain, findChainByEnum: () => chain };
});
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/utils', () => ({}));
jest.mock('@/utils/sentry', () => ({
  takeSigningCarrier: () => undefined,
  getSigningContext: () => undefined,
}));
jest.mock('@/background/controller/base', () => class {});
jest.mock('@/background/controller/wallet', () => ({}));
jest.mock('@/background/controller/utils', () => ({}));
jest.mock('@/background/service/customTestnet', () => ({}));
jest.mock('@/background/utils/rpcCache', () => ({}));
jest.mock('@/background/utils/buildinProvider', () => ({}));
jest.mock('@/background/utils/tx', () => ({}));
jest.mock('@/background/utils/gasAccountLogin', () => ({}));
jest.mock('@/background/controller/walletUtils/fix', () => ({
  fixKeyringAccountOnSigned: jest.fn(),
}));

const isBlockedAddress = openapiService.isBlockedAddress as jest.Mock;

const submit = (overrides: Record<string, any> = {}) => {
  const txParams = {
    from,
    chainId: '0x1079',
    type: '0x76',
    to,
    data,
    value: '0x1',
    gas: '0x493e0',
    maxFeePerGas: '0x2',
    maxPriorityFeePerGas: '0x1',
    nonce: '0x0',
    ...overrides,
  };
  const approvalRes: ApprovalRes & { calls?: TempoTxCall[] } = {
    ...buildTempoTransaction(
      buildSignTx({
        tx: normalizeTxParams(txParams as any, true) as any,
        chainId: 4217,
      }),
      { feePayer: false }
    ),
    isGasAccount: false,
    signingTxId: 'signing-tx',
  };
  return providerController.ethSendTransaction({
    data: { params: [txParams] },
    session: { origin: 'https://example.test', name: '', icon: '' },
    approvalRes,
    account: { address: from, type: 'Simple Key Pair', brandName: '' },
    pushed: false,
    result: undefined,
  } as any);
};

describe('ethSendTransaction blocked address check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearBlockedAddressCache();
    mockSigningTx = { rawTx: {} };
    keyringService.keyrings = [keyring];
    jest.mocked(keyringService.isUnlocked).mockReturnValue(true);
    jest
      .mocked(transactionHistoryService.wasSigningTxUserCancelled)
      .mockReturnValue(false);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['sender', from, {}],
    ['receiver', to, {}],
    // `data` is an ERC-20 transfer to 0x…dead: the receiver only lives in calldata.
    ['ERC-20 calldata receiver', `0x${'dead'.padStart(40, '0')}`, {}],
    [
      'batched call target',
      other,
      { calls: [{ to: other, data, value: '0x0' }] },
    ],
  ])(
    'refuses before signing when the %s is blocked',
    async (_name, blocked, overrides) => {
      isBlockedAddress.mockImplementation(async (addr: string) => ({
        is_blocked: addr.toLowerCase() === blocked.toLowerCase(),
      }));

      await expect(submit(overrides)).rejects.toMatchObject({
        message: 'page.sendToken.blockedTransactionContent',
        method: 'REJECTED',
      });
      expect(keyringService.signTransaction).not.toHaveBeenCalled();
    }
  );

  test('signs when no address is blocked', async () => {
    isBlockedAddress.mockResolvedValue({ is_blocked: false });

    await expect(submit()).rejects.toMatchObject({
      message: stopAfterSigning.message,
    });
    expect(isBlockedAddress).toHaveBeenCalledWith(from);
    expect(isBlockedAddress).toHaveBeenCalledWith(to);
    expect(keyringService.signTransaction).toHaveBeenCalled();
  });

  test('signs when the check itself fails, like SignTx', async () => {
    isBlockedAddress.mockRejectedValue(new Error('network down'));

    await expect(submit()).rejects.toMatchObject({
      message: stopAfterSigning.message,
    });
    expect(keyringService.signTransaction).toHaveBeenCalled();
  });

  test.each([
    'cancel',
    'replace',
    'lock',
    'reunlock',
    'failed lookup after cancel',
  ])(
    'does not sign after %s while the recipient lookup is pending',
    async (action) => {
      let finish!: (value: { is_blocked: boolean }) => void;
      let fail!: (reason: Error) => void;
      const pendingCheck = new Promise<{ is_blocked: boolean }>(
        (resolve, reject) => {
          finish = resolve;
          fail = reject;
        }
      );
      isBlockedAddress.mockImplementation((address: string) =>
        address.endsWith('dead')
          ? pendingCheck
          : Promise.resolve({ is_blocked: false })
      );
      const pending = submit();
      for (let i = 0; i < 20; i++) await Promise.resolve();
      expect(isBlockedAddress).toHaveBeenCalledWith(
        `0x${'dead'.padStart(40, '0')}`
      );
      expect(keyringService.signTransaction).not.toHaveBeenCalled();

      if (action === 'replace') mockSigningTx = { rawTx: {} };
      else if (action === 'lock')
        jest.mocked(keyringService.isUnlocked).mockReturnValue(false);
      else if (action === 'reunlock') keyringService.keyrings = [{}];
      else mockSigningTx = undefined;
      if (action === 'failed lookup after cancel') fail(new Error('offline'));
      else finish({ is_blocked: false });

      await expect(pending).rejects.toMatchObject({
        message: 'The transaction signing request is no longer active.',
      });
      expect(keyringService.signTransaction).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['signing', true],
    ['signing', false],
    ['frontend RPC push', true],
    ['frontend RPC push', false],
  ] as const)(
    'stops when the record is removed during %s (confirmed cancel: %s)',
    async (stage, userCancelled) => {
      isBlockedAddress.mockResolvedValue({ is_blocked: false });
      const signingTx = mockSigningTx;
      jest
        .mocked(transactionHistoryService.wasSigningTxUserCancelled)
        .mockReturnValueOnce(userCancelled);
      jest
        .mocked(keyringService.signTransaction)
        .mockImplementationOnce(async () => {
          if (stage === 'signing') mockSigningTx = undefined;
          return {
            r: '01',
            s: '01',
            v: '1b',
            serializedTransaction: '0x76ff',
          } as any;
        });
      jest
        .mocked(RPCService.defaultRPCSubmitTxWithFallback)
        .mockImplementation(async () => {
          mockSigningTx = undefined;
          throw new Error('RPC unavailable');
        });
      jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const error = await submit().catch((e) => e);
      expect(RPCService.defaultRPCSubmitTxWithFallback).toHaveBeenCalledTimes(
        stage === 'signing' ? 0 : 1
      );
      expect(error.message).toContain(
        'The transaction signing request is no longer active.'
      );
      expect(
        transactionHistoryService.wasSigningTxUserCancelled
      ).toHaveBeenCalledWith(signingTx);
      expect(isUserCancelledSigningError(error)).toBe(userCancelled);
      expect(transactionOpenapi.submitTxV2).not.toHaveBeenCalled();
      if (stage === 'signing') expect(error.method).toBe('REJECTED');
    }
  );
});
