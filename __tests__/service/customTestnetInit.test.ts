const mockCreatePersistStore = jest.fn();
const mockStorageGet = jest.fn();

jest.mock('@/constant', () => ({
  CUSTOM_RPC_ENABLED: true,
  EVENTS: { broadcastToUI: 'broadcastToUI' },
}));
jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
  updateChainStore: jest.fn(),
}));
jest.mock('@/ui/utils/token', () => ({
  customTestnetTokenToTokenItem: jest.fn((token) => token),
}));
jest.mock('@/background/utils', () => ({
  createPersistStore: (...args: unknown[]) => mockCreatePersistStore(...args),
}));
jest.mock('@/background/utils/http', () => ({ http: { post: jest.fn() } }));
jest.mock('@/background/utils/ipfs', () => ({
  getFormattedIpfsUrl: jest.fn(),
}));
jest.mock('@/background/webapi', () => ({
  storage: { get: (...args: unknown[]) => mockStorageGet(...args) },
}));
jest.mock('@/background/service/rpc', () => ({
  __esModule: true,
  default: { hasCustomRPC: () => false },
}));

import {
  createTestnetChain,
  customTestnetService,
} from '@/background/service/customTestnet';

const chain = createTestnetChain({
  id: 123456,
  name: 'Custom network',
  nativeTokenSymbol: 'ETH',
  rpcUrl: 'https://rpc.example',
});

const rpcUrlOf = (id: number) =>
  (customTestnetService.chains[id] as any).transport.url;

describe('customTestnetService.init with the raw RPC store', () => {
  beforeEach(() => {
    customTestnetService.chains = {};
    mockCreatePersistStore.mockResolvedValue({
      customTestnet: { [chain.id]: chain },
      customTokenList: [],
      logos: {},
      logosUpdatedAt: Date.now(),
      eip1559: { [chain.id]: { value: false, checkedAt: Date.now() } },
    });
    jest
      .spyOn(customTestnetService, 'syncChainList')
      .mockImplementation(() => undefined);
    jest
      .spyOn(customTestnetService, 'fetchLogos')
      .mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([undefined, {}, { customRPC: null }])(
    'creates clients from the chain RPC when the store is %p',
    async (rpcStore) => {
      mockStorageGet.mockResolvedValue(rpcStore);

      await expect(customTestnetService.init()).resolves.toBeUndefined();
      expect(rpcUrlOf(chain.id)).toBe('https://rpc.example');
    }
  );

  it('still applies an enabled custom RPC', async () => {
    mockStorageGet.mockResolvedValue({
      customRPC: {
        [chain.enum]: { url: 'https://custom.example', enable: true },
      },
    });

    await customTestnetService.init();
    expect(rpcUrlOf(chain.id)).toBe('https://custom.example');
  });
});
