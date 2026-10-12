import BigNumber from 'bignumber.js';
import { intToHex } from '@ethereumjs/util';
import { sendTransaction } from '@/ui/utils/sendTransaction';

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
  EVENTS: {},
  GASPRICE_RANGE: {},
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  INTERNAL_REQUEST_SESSION: {},
  KEYRING_CATEGORY_MAP: {},
  KEYRING_TYPE: {},
  MINIMUM_GAS_LIMIT: 21000,
  SAFE_GAS_LIMIT_BUFFER: {},
  SAFE_GAS_LIMIT_RATIO: {},
}));
jest.mock('@/ui/utils', () => ({
  intToHex: (value: number) => `0x${value.toString(16)}`,
}));
jest.mock('@/utils/chain', () => ({
  findChain: () => ({
    id: 999,
    enum: 'HYPER',
    serverId: 'hyper',
    eip: { '1559': false },
  }),
  isTestnet: () => false,
}));
jest.mock('@/utils/tempo', () => ({
  isTempoChain: () => false,
  shouldUseTempoTransaction: () => false,
}));
jest.mock('@/utils/transaction', () => ({
  ...jest.requireActual('@/utils/transaction'),
  getGasTokenBalance: jest.fn().mockResolvedValue({
    rawBalance: '1000000000000000000',
    token: { decimals: 18 },
  }),
  explainGas: jest.fn().mockImplementation(async () => ({
    gasCostUsd: new BigNumber(0),
    gasCostAmount: new BigNumber(0),
    maxGasCostAmount: new BigNumber(0),
    maxGasCostRawAmount: new BigNumber(0),
  })),
}));
jest.mock('@rabby-wallet/rabby-action', () => ({
  parseAction: () => ({}),
  fetchActionRequiredData: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/ui/state/exchange', () => ({
  getCexInfo: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/stats', () => ({ __esModule: true, default: {} }));
jest.mock('@/eventBus', () => ({ __esModule: true, default: {} }));

const account = { address: '0xsender', type: 'Simple Key Pair' } as any;
const createWallet = (mode: boolean | null = true, estimated = 8_300_000) => ({
  addSigningTx: jest.fn().mockResolvedValue('signing-id'),
  updateSigningTx: jest.fn().mockResolvedValue(undefined),
  reportStats: jest.fn(),
  getStatsData: jest.fn().mockResolvedValue({}),
  requestETHRpc: jest.fn().mockResolvedValue(mode),
  getRecommendGas: jest.fn().mockResolvedValue({
    gas: estimated,
    gasUsed: estimated,
    needRatio: true,
  }),
  ethSendTransaction: jest.fn().mockResolvedValue('0xhash'),
});
const send = (
  wallet: ReturnType<typeof createWallet>,
  gas?: number,
  estimate = 8_300_000
) =>
  sendTransaction({
    wallet: wallet as any,
    chainServerId: 'hyper',
    tx: {
      from: account.address,
      to: '0xrecipient',
      chainId: 999,
      value: '0x0',
      data: '0x',
      nonce: '0x1',
      ...(gas ? { gas: intToHex(gas) } : {}),
    },
    account,
    gasLevel: { level: 'normal', price: 1 } as any,
    ignoreGasCheck: true,
    ignoreGasNotEnoughCheck: true,
    ignoreSimulationFailed: true,
    isGasAccount: true,
    isGasLess: true,
    waitCompleted: false,
    extra: {
      preExecResult: {
        gas: {
          success: true,
          gas_limit: estimate,
          gas_used: estimate,
          gas_ratio: 1.5,
        },
        native_token: { symbol: 'HYPE', price: 1 },
      } as any,
      actionData: { action: {}, log_id: 'log-id' } as any,
    },
  });

describe('direct HyperEVM gas limit calculation', () => {
  test.each([
    [true, 12_450_000],
    [false, 3_000_000],
    [null, 3_000_000],
  ])('uses the sender mode %j for calculated gas', async (mode, expected) => {
    const wallet = createWallet(mode);
    await expect(send(wallet)).resolves.toMatchObject({
      txHash: '0xhash',
    });
    expect(wallet.ethSendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalRes: expect.objectContaining({ gas: intToHex(expected) }),
      })
    );
    expect(wallet.requestETHRpc).toHaveBeenCalledTimes(1);
    expect(wallet.requestETHRpc).toHaveBeenCalledWith(
      { method: 'eth_usingBigBlocks', params: [account.address] },
      'hyper'
    );
  });

  test.each([21_000, 10_000_000])(
    'preserves exact preset gas %i without a mode query',
    async (gas) => {
      const wallet = createWallet();
      await expect(send(wallet, gas)).resolves.toMatchObject({
        txHash: '0xhash',
      });
      expect(wallet.ethSendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalRes: expect.objectContaining({ gas: intToHex(gas) }),
        })
      );
      expect(wallet.requestETHRpc).not.toHaveBeenCalled();
    }
  );
});
