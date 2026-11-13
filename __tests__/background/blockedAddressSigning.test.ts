import 'reflect-metadata';
import SimpleKeyring from '@rabby-wallet/eth-simple-keyring';
import {
  ApprovalRes,
  buildSignTx,
  normalizeTxParams,
} from '@/utils/transaction';
import { buildTempoTransaction, TempoTxCall } from '@/utils/tempo';
import providerController from '@/background/controller/provider/controller';
import { keyringService } from 'background/service';
import openapiService from '@/background/service/openapi';
import { clearBlockedAddressCache } from '@/background/service/blockedAddress';

const from = '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf';
const to = '0x20c0000000000000000000000000000000000000';
const other = '0x1111111111111111111111111111111111111111';
const data = `0xa9059cbb${'dead'.padStart(64, '0')}${'2710'.padStart(64, '0')}`;
const keyring = new SimpleKeyring(['1'.padStart(64, '0')]);
const stopAfterSigning = new Error('stop before broadcast');

jest.mock('background/service', () => ({
  keyringService: {
    getKeyringForAccount: jest.fn(async () => keyring),
    signTransaction: jest.fn(async () => {
      throw stopAfterSigning;
    }),
  },
  i18n: { t: (key: string) => key },
  transactionHistoryService: {
    getSigningTx: () => ({ rawTx: {} }),
  },
  RPCService: { probeBestRPC: jest.fn() },
}));
jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: { isBlockedAddress: jest.fn() },
}));
jest.mock('consts', () => ({
  KEYRING_TYPE: { SimpleKeyring: 'Simple Key Pair', HdKeyring: 'HD Key Tree' },
  KEYRING_CATEGORY_MAP: {},
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
jest.mock('@/background/controller/walletUtils/fix', () => ({}));

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
});
