const mockProviderController = {
  web3ClientVersion: jest.fn(() => 'Rabby/test'),
  ethRpc: jest.fn(async () => 'forwarded-result'),
};
const mockNotificationService = {
  on: jest.fn(),
};
const mockWallet = {
  sendRequest: jest.fn(),
};

jest.mock('@/background/controller/provider/controller', () => ({
  __esModule: true,
  default: mockProviderController,
}));
jest.mock('background/service/preference', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('background/service/notification', () => ({
  __esModule: true,
  default: mockNotificationService,
}));
jest.mock('@/background/controller/wallet', () => ({
  __esModule: true,
  default: mockWallet,
}));
jest.mock('consts', () => ({
  CHAINS: {
    ETH: { id: 1, hex: '0x1', serverId: 'eth' },
  },
  CHAINS_ENUM: { ETH: 'ETH' },
  INTERNAL_REQUEST_SESSION: { origin: 'chrome-extension://rabby' },
}));
jest.mock('background/utils', () => ({
  underline2Camelcase: (value: string) =>
    value.replace(/_(.)/g, (_, char) => char.toUpperCase()),
}));
jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(() => ({ id: 1, hex: '0x1', serverId: 'eth' })),
}));

import { EthereumProvider } from '@/background/utils/buildinProvider';

describe('built-in provider method dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each(['constructor', 'toString', 'valueOf', '__proto__'])(
    'rejects inherited property %s',
    async (method) => {
      const provider = new EthereumProvider();

      await expect(provider.request({ method, params: [] })).rejects.toThrow(
        `method [${method}] doesn't has corresponding handler`
      );
      expect(mockProviderController.ethRpc).not.toHaveBeenCalled();
    }
  );

  test('still dispatches an own controller method', async () => {
    const provider = new EthereumProvider();

    await expect(
      provider.request({ method: 'web3_clientVersion', params: [] })
    ).resolves.toBe('Rabby/test');
    expect(mockProviderController.web3ClientVersion).toHaveBeenCalledTimes(1);
  });

  test('still forwards unknown eth methods to ethRpc', async () => {
    const provider = new EthereumProvider();

    await expect(
      provider.request({ method: 'eth_customMethod', params: [] })
    ).resolves.toBe('forwarded-result');
    expect(mockProviderController.ethRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ method: 'eth_customMethod' }),
      }),
      'eth'
    );
  });
});
