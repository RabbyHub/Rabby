import 'reflect-metadata';
import providerController from '@/background/controller/provider/controller';
import { RPCService } from 'background/service';
import RpcCache from '@/background/utils/rpcCache';
import { customTestnetService } from '@/background/service/customTestnet';
import { findChain } from '@/utils/chain';

jest.mock('background/service', () => ({
  keyringService: {},
  permissionService: {
    hasPermission: jest.fn(() => true),
    getSite: jest.fn(() => undefined),
  },
  RPCService: {
    probeBestRPC: jest.fn(),
    hasCustomRPC: jest.fn(() => false),
    requestCustomRPC: jest.fn(),
    requestDefaultRPC: jest.fn(async () => '0xdefault'),
  },
}));
jest.mock('consts', () => ({
  CHAINS: { ETH: { serverId: 'eth' } },
  CHAINS_ENUM: { ETH: 'ETH' },
  SAFE_RPC_METHODS: [],
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  KEYRING_TYPE: {},
  EVENTS: {},
}));
jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
  findChainByEnum: jest.fn(),
}));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/utils', () => ({}));
jest.mock('@/utils/sentry', () => ({}));
jest.mock('@/background/controller/base', () => class {});
jest.mock('@/background/controller/wallet', () => ({}));
jest.mock('@/background/controller/utils', () => ({}));
jest.mock('@/background/service/customTestnet', () => ({
  customTestnetService: { getClient: jest.fn() },
}));
jest.mock('@/background/utils/rpcCache', () => ({
  __esModule: true,
  default: { get: jest.fn(), set: jest.fn() },
}));
jest.mock('@/background/utils/buildinProvider', () => ({}));
jest.mock('@/background/utils/tx', () => ({}));
jest.mock('@/background/utils/gasAccountLogin', () => ({}));
jest.mock('@/background/controller/walletUtils/fix', () => ({}));

const ethChain = { id: 1, serverId: 'eth', enum: 'ETH', isTestnet: false };
const customNetwork = {
  id: 123456,
  serverId: 'custom_123456',
  enum: 'CUSTOM_123456',
  isTestnet: true,
};

// rpcFlow awaits ethRpc from an async middleware, so a synchronous throw is
// seen by the dapp as a rejection; mirror that here.
const callEthRpc = async (forceChainServerId?: string) =>
  providerController.ethRpc(
    {
      data: { method: 'eth_call', params: [{ to: '0x0' }, 'latest'] },
      session: { origin: 'https://rabby.io' },
      account: { address: '0xAbC' },
    },
    forceChainServerId
  );

describe('ethRpc with an unknown chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(RpcCache.get).mockReturnValue(undefined);
    jest
      .mocked(findChain)
      .mockImplementation(
        ({ serverId }: any) =>
          [ethChain, customNetwork].find((c) => c.serverId === serverId) as any
      );
  });

  test('rejects with a 4902 RPC error instead of a TypeError', async () => {
    await expect(callEthRpc('custom_removed')).rejects.toMatchObject({
      code: 4902,
      message: 'Unrecognized chain "custom_removed".',
    });
  });

  test('does not send the request anywhere', async () => {
    await expect(callEthRpc('custom_removed')).rejects.toMatchObject({
      code: 4902,
    });

    expect(RPCService.probeBestRPC).not.toHaveBeenCalled();
    expect(RPCService.requestCustomRPC).not.toHaveBeenCalled();
    expect(RPCService.requestDefaultRPC).not.toHaveBeenCalled();
    expect(customTestnetService.getClient).not.toHaveBeenCalled();
  });

  test('does not serve a cached result for a chain that is gone', async () => {
    jest.mocked(RpcCache.get).mockReturnValue('0xstale' as any);

    await expect(callEthRpc('custom_removed')).rejects.toMatchObject({
      code: 4902,
    });
    expect(RpcCache.get).not.toHaveBeenCalled();
  });

  test('rejects when the chain list has not loaded the default chain yet', async () => {
    jest.mocked(findChain).mockReturnValue(undefined);

    await expect(callEthRpc()).rejects.toMatchObject({ code: 4902 });
    expect(RPCService.requestDefaultRPC).not.toHaveBeenCalled();
  });

  test('still forwards requests on a known mainnet chain', async () => {
    await expect(callEthRpc('eth')).resolves.toBe('0xdefault');
    expect(RPCService.requestDefaultRPC).toHaveBeenCalledWith(
      expect.objectContaining({ chainServerId: 'eth', method: 'eth_call' })
    );
  });

  test('still forwards requests on a known custom network', async () => {
    const request = jest.fn(async () => '0xcustom');
    jest
      .mocked(customTestnetService.getClient)
      .mockReturnValue({ request } as any);

    await expect(callEthRpc('custom_123456')).resolves.toBe('0xcustom');
    expect(customTestnetService.getClient).toHaveBeenCalledWith(123456);
    expect(request).toHaveBeenCalledWith({
      method: 'eth_call',
      params: [{ to: '0x0' }, 'latest'],
    });
  });
});
