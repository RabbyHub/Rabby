import {
  getSignTxPreparation,
  startSignTxPreparation,
} from '@/background/service/signTxPreparation';

const ADDRESS = '0xabc0000000000000000000000000000000000001';
const SESSION = { name: 'Rabby', origin: 'internal' };

const mockEthRpc = jest.fn();
const mockGetList = jest.fn();
const mockPreExecTx = jest.fn();

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('consts', () => ({
  CAN_ESTIMATE_L1_FEE_CHAINS: [],
  DEFAULT_GAS_LIMIT_BUFFER: 0,
  DEFAULT_GAS_LIMIT_RATIO: 1,
  GASPRICE_RANGE: {},
  KEYRING_CATEGORY_MAP: {},
  MINIMUM_GAS_LIMIT: 21000,
  SAFE_GAS_LIMIT_BUFFER: 0,
  SAFE_GAS_LIMIT_RATIO: 1,
  INTERNAL_REQUEST_SESSION: { name: 'Rabby', origin: 'internal' },
}));
jest.mock('@/utils/chain', () => ({
  findChain: () => ({ id: 56, serverId: 'bsc', enum: 'BSC' }),
}));
jest.mock('@/utils/transaction', () => ({
  ...jest.requireActual('@/utils/transaction'),
  prepareInitialGasSelection: jest.fn(async ({ tx }) => ({
    tx,
    gasList: [],
    gas: {},
    fee: 0,
  })),
}));
jest.mock('@/background/controller/provider/controller', () => ({
  __esModule: true,
  default: { ethRpc: (...args: unknown[]) => mockEthRpc(...args) },
}));
jest.mock('@/background/controller/walletUtils/sign', () => ({
  getRecommendNonce: jest.fn(async () => '0xc6'),
}));
jest.mock('@/background/service/gasMarket', () => ({
  gasMarketV2: jest.fn(),
}));
jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: {
    parseTx: jest.fn(async () => ({})),
    preExecTx: (...args: unknown[]) => mockPreExecTx(...args),
  },
}));
jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: { getLastTimeGasSelection: jest.fn(() => null) },
}));
jest.mock('@/background/service/transactionHistory', () => ({
  __esModule: true,
  default: { getList: (...args: unknown[]) => mockGetList(...args) },
}));

const pending = (chainId: number, nonce: number) => ({
  chainId,
  nonce,
  txs: [
    {
      rawTx: {
        from: ADDRESS,
        to: '0xto',
        chainId,
        data: '0x',
        nonce: `0x${nonce.toString(16)}`,
        value: '0x0',
        gasPrice: '0x2faf080',
        gas: '0x5208',
      },
    },
  ],
});

const prepare = async (id: string) => {
  startSignTxPreparation({
    id,
    tx: { from: ADDRESS, to: '0xto', chainId: 56, value: '0x0' } as any,
    origin: 'https://dapp.example',
    address: ADDRESS,
    chainId: 56,
    support1559: false,
  });
  return getSignTxPreparation(id);
};

beforeEach(() => {
  // startSignTxPreparation 会留下一个 60s 的清理定时器
  jest.useFakeTimers();
  mockEthRpc.mockReset();
  mockPreExecTx.mockReset().mockResolvedValue({ pre_exec: { success: true } });
  mockGetList.mockReset().mockReturnValue({
    // 192 已上链但本地仍是 pending；196、197 才是真的 pending
    pendings: [pending(56, 197), pending(56, 192), pending(56, 196)],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

it('pre-executes without the pending txs that are below the on-chain nonce', async () => {
  mockEthRpc.mockResolvedValue('0xc4');

  const prepared = await prepare('prep-filtered');

  expect(mockEthRpc).toHaveBeenCalledWith(
    {
      data: {
        method: 'eth_getTransactionCount',
        params: [ADDRESS, 'latest'],
      },
      session: SESSION,
    },
    'bsc'
  );
  expect(prepared?.pendingTxList?.map((tx) => tx.nonce)).toEqual([
    '0xc4',
    '0xc5',
  ]);
  expect(
    mockPreExecTx.mock.calls[0][0].pending_tx_list.map((tx) => tx.nonce)
  ).toEqual(['0xc4', '0xc5']);
});

it('pre-executes with every pending tx when the on-chain nonce cannot be read', async () => {
  mockEthRpc.mockRejectedValue(new Error('network'));

  const prepared = await prepare('prep-unfiltered');

  expect(prepared?.pendingTxList?.map((tx) => tx.nonce)).toEqual([
    '0xc0',
    '0xc4',
    '0xc5',
  ]);
});
