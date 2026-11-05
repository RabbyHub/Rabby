import 'reflect-metadata';
import SimpleKeyring from '@rabby-wallet/eth-simple-keyring';
import providerController from '@/background/controller/provider/controller';
import { keyringService } from 'background/service';
import { findChain } from '@/utils/chain';

const from = '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf';
const to = '0x20c0000000000000000000000000000000000000';
const keyring = new SimpleKeyring(['1'.padStart(64, '0')]);
const stopAfterSigning = new Error('stop before broadcast');

jest.mock('background/service', () => ({
  keyringService: {
    getKeyringForAccount: jest.fn(async () => keyring),
    signTransaction: jest.fn(async () => {
      throw stopAfterSigning;
    }),
  },
  transactionHistoryService: {
    getSigningTx: () => ({ rawTx: {} }),
  },
  permissionService: { getConnectedSite: () => undefined },
  RPCService: { probeBestRPC: jest.fn() },
}));
jest.mock('consts', () => ({
  KEYRING_TYPE: { SimpleKeyring: 'Simple Key Pair', HdKeyring: 'HD Key Tree' },
  KEYRING_CATEGORY_MAP: {},
  EVENTS: { COMMON_HARDWARE: { REJECTED: 'REJECTED' } },
}));
jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
  findChainByEnum: jest.fn(),
}));
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

const customNetwork = {
  id: 123456,
  serverId: 'custom_123456',
  enum: 'CUSTOM_123456',
  isTestnet: true,
};
const integratedNetwork = { id: 1, serverId: 'eth', enum: 'ETH' };

const sign = async (fees: Record<string, string>, chainId: number) => {
  const txParams = {
    from,
    to,
    chainId,
    data: '0x',
    value: '0x0',
    gas: '0x5208',
    nonce: '0x0',
    ...fees,
  };
  await expect(
    providerController.ethSendTransaction({
      data: { params: [txParams] },
      session: { origin: 'https://example.test', name: '', icon: '' },
      approvalRes: { ...txParams } as any,
      account: { address: from, type: 'Simple Key Pair', brandName: '' },
      pushed: false,
      result: undefined,
    })
  ).rejects.toMatchObject({ message: stopAfterSigning.message });
  return jest.mocked(keyringService.signTransaction).mock.calls[0][1];
};

describe('EIP-1559 legacy fallback by network', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  test('keeps a custom network tx with maxFee == tip as type-2', async () => {
    jest.mocked(findChain).mockReturnValue(customNetwork as any);
    const tx = await sign(
      { maxFeePerGas: '0x3b9aca00', maxPriorityFeePerGas: '0x3b9aca00' },
      customNetwork.id
    );

    expect(tx.type).toBe(2);
    expect(tx.maxFeePerGas).toBe(1_000_000_000n);
    expect(tx.maxPriorityFeePerGas).toBe(1_000_000_000n);
  });

  test('signs a custom network tx with maxFee > tip as type-2', async () => {
    jest.mocked(findChain).mockReturnValue(customNetwork as any);
    const tx = await sign(
      { maxFeePerGas: '0x77359400', maxPriorityFeePerGas: '0x3b9aca00' },
      customNetwork.id
    );

    expect(tx.type).toBe(2);
    expect(tx.maxFeePerGas).toBe(2_000_000_000n);
    expect(tx.maxPriorityFeePerGas).toBe(1_000_000_000n);
  });

  test('still downgrades an integrated network tx with maxFee == tip', async () => {
    jest.mocked(findChain).mockReturnValue(integratedNetwork as any);
    const tx = await sign(
      { maxFeePerGas: '0x3b9aca00', maxPriorityFeePerGas: '0x3b9aca00' },
      integratedNetwork.id
    );

    expect(tx.type).toBe(0);
    expect(tx.gasPrice).toBe(1_000_000_000n);
  });

  test('downgrades when the chain cannot be found', async () => {
    jest.mocked(findChain).mockReturnValue(undefined as any);
    const tx = await sign(
      { maxFeePerGas: '0x3b9aca00', maxPriorityFeePerGas: '0x3b9aca00' },
      customNetwork.id
    );

    expect(tx.type).toBe(0);
  });

  test('rejects a custom network tx whose tip exceeds maxFee before signing', async () => {
    jest.mocked(findChain).mockReturnValue(customNetwork as any);
    const txParams = {
      from,
      to,
      chainId: customNetwork.id,
      data: '0x',
      value: '0x0',
      gas: '0x5208',
      nonce: '0x0',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x77359400',
    };

    await expect(
      providerController.ethSendTransaction({
        data: { params: [txParams] },
        session: { origin: 'https://example.test', name: '', icon: '' },
        approvalRes: { ...txParams } as any,
        account: { address: from, type: 'Simple Key Pair', brandName: '' },
        pushed: false,
        result: undefined,
      })
    ).rejects.toThrow('maxFeePerGas cannot be less than maxPriorityFeePerGas');
    expect(keyringService.signTransaction).not.toHaveBeenCalled();
  });
});
