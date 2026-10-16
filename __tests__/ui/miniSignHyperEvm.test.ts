import { intToHex } from '@ethereumjs/util';
import { SignatureSteps } from '@/ui/component/MiniSignV2/services/SignatureSteps';

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('consts', () => ({
  ALIAS_ADDRESS: {},
  CAN_ESTIMATE_L1_FEE_CHAINS: [],
  CHAINS_ENUM: { ETH: 'ETH' },
  DEFAULT_GAS_LIMIT_BUFFER: 0.95,
  DEFAULT_GAS_LIMIT_RATIO: 1.5,
  GASPRICE_RANGE: {},
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  KEYRING_TYPE: { HdKeyring: 'HD' },
  MINIMUM_GAS_LIMIT: 21000,
  SAFE_GAS_LIMIT_BUFFER: 0.95,
  SAFE_GAS_LIMIT_RATIO: 1,
  SUPPORT_1559_KEYRING_TYPE: [],
}));
jest.mock('@/utils/chain', () => ({
  findChain: ({ id }: { id: number }) => ({
    id,
    enum: id === 999 ? 'HYPER' : 'ETH',
    serverId: id === 999 ? 'hyper' : 'eth',
    nativeTokenDecimals: 18,
    nativeTokenSymbol: 'HYPE',
  }),
  isTestnet: () => false,
}));
jest.mock('@/utils/tempo', () => ({
  isTempoChain: () => false,
  shouldUseTempoTransaction: () => false,
}));
jest.mock('@/ui/views/Approval/components/SignTx', () => ({
  normalizeTxParams: jest.requireActual('@/utils/transaction')
    .normalizeTxParams,
}));
jest.mock('@/ui/utils/sendTransaction', () => ({
  sendTransactionByMiniSignV2: jest.fn(),
}));
jest.mock('@rabby-wallet/rabby-action', () => ({}));
jest.mock('@/ui/state/exchange', () => ({}));
jest.mock('@/ui/component/AuthenticationModal', () => ({}));
jest.mock('@/ui/utils/ledger', () => ({
  isLedgerConnectionRecoverableError: () => false,
  isLedgerLockError: () => false,
}));

const account = { address: '0xsender', type: 'Simple Key Pair' } as any;
const createTx = (gas?: number, chainId = 999) => ({
  from: account.address,
  to: '0xrecipient',
  chainId,
  value: '0x0',
  data: '0x',
  ...(gas ? { gas: intToHex(gas) } : {}),
});
const createWallet = (usingBigBlocks: boolean | null = true) => ({
  requestETHRpc: jest.fn(async ({ method }) => {
    if (method === 'eth_usingBigBlocks') return usingBigBlocks;
    if (method === 'eth_getBlockByNumber')
      return { gasLimit: intToHex(3_000_000) };
    return '0xde0b6b3a7640000';
  }),
  syncDefaultRPC: jest.fn().mockResolvedValue(undefined),
  gasMarketV2: jest.fn().mockResolvedValue([{ level: 'normal', price: 1 }]),
  hasCustomRPC: jest.fn().mockResolvedValue(false),
  getRecommendNonce: jest.fn().mockResolvedValue('0x1'),
  getRecommendGas: jest.fn().mockResolvedValue({
    gas: 8_300_000,
    gasUsed: 8_300_000,
    needRatio: true,
  }),
  getTransactionHistory: jest.fn().mockResolvedValue({ pendings: [] }),
  getGasAccountSig: jest.fn().mockResolvedValue({ sig: 'sig' }),
  openapi: {
    gasPriceStats: jest.fn().mockResolvedValue({ median: 1 }),
    historyGasUsed: jest.fn().mockResolvedValue({}),
    preExecTx: jest.fn().mockResolvedValue({
      gas: {
        success: true,
        gas_limit: 8_300_000,
        gas_used: 8_000_000,
        gas_ratio: 1.5,
      },
      native_token: { price: 1 },
      pre_exec: { success: true },
    }),
    gasLessTxsCheck: jest.fn().mockResolvedValue({ is_gasless: true }),
    checkGasAccountTxs: jest.fn().mockResolvedValue({
      balance_is_enough: true,
      is_gas_account: true,
    }),
  },
});
const prepare = (wallet: ReturnType<typeof createWallet>, tx = createTx()) =>
  SignatureSteps.prepareContext({
    wallet: wallet as any,
    account,
    txs: [tx] as any,
  });

describe('MiniSign HyperEVM gas calculation', () => {
  test('uses the big-block mode for an estimate above the latest small-block limit', async () => {
    const wallet = createWallet(true);
    const prepared = await prepare(wallet);
    expect(prepared.txsCalc[0]).toMatchObject({
      gasLimit: intToHex(12_450_000),
      recommendGasLimitRatio: 1.5,
    });
    expect(wallet.requestETHRpc).toHaveBeenCalledWith(
      { method: 'eth_usingBigBlocks', params: [account.address] },
      'hyper'
    );
    expect(
      wallet.requestETHRpc.mock.calls.some(
        ([request]) => request.method === 'eth_getBlockByNumber'
      )
    ).toBe(false);
  });

  test.each([false, null])(
    'caps the estimate at 3M when big-block mode is %s',
    async (mode) => {
      const prepared = await prepare(createWallet(mode));
      expect(prepared.txsCalc[0].gasLimit).toBe(intToHex(3_000_000));
    }
  );

  test.each([true, false, null])(
    'preserves preset gas without querying mode %s',
    async (mode) => {
      const wallet = createWallet(mode);
      const prepared = await prepare(wallet, createTx(10_000_000));
      expect(prepared.txsCalc[0]).toMatchObject({
        gasLimit: intToHex(10_000_000),
        recommendGasLimitRatio: 1,
      });
      expect(
        wallet.requestETHRpc.mock.calls.some(
          ([request]) => request.method === 'eth_usingBigBlocks'
        )
      ).toBe(false);
    }
  );

  test('retains the latest block buffer for an ordinary chain', async () => {
    const wallet = createWallet();
    const prepared = await prepare(wallet, createTx(undefined, 1));
    expect(prepared.txsCalc[0].gasLimit).toBe(intToHex(2_850_000));
    expect(wallet.requestETHRpc).toHaveBeenCalledWith(
      { method: 'eth_getBlockByNumber', params: ['latest', false] },
      'eth'
    );
    expect(
      wallet.requestETHRpc.mock.calls.some(
        ([request]) => request.method === 'eth_usingBigBlocks'
      )
    ).toBe(false);
  });

  test('preserves preset gas on an ordinary chain without querying HyperEVM mode', async () => {
    const wallet = createWallet();
    const prepared = await prepare(wallet, createTx(21_000, 1));
    expect(prepared.txsCalc[0].gasLimit).toBe(intToHex(21_000));
    expect(
      wallet.requestETHRpc.mock.calls.some(
        ([request]) => request.method === 'eth_usingBigBlocks'
      )
    ).toBe(false);
  });
});
