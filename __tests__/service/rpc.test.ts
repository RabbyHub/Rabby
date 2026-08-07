jest.mock('@/background/utils', () => ({
  createPersistStore: jest.fn(),
}));

jest.mock('@/background/utils/http', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: {
    ethRpc: jest.fn(),
    getDefaultRPCs: jest.fn(),
  },
}));

jest.mock('@/utils/chain', () => ({
  findChainByEnum: jest.fn(),
}));

jest.mock('@/constant', () => ({
  CUSTOM_RPC_ENABLED: false,
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
}));

import RPCService from '@/background/service/rpc';

describe('RPCService preferred RPC', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('probes without blocking submission and prefers the highest block RPC', async () => {
    const chainServerId = 'chain';
    const staleRPC = 'https://stale.example';
    const bestRPC = 'https://best.example';
    let resolveStaleBlock!: (blockNumber: string) => void;
    let resolveBestBlock!: (blockNumber: string) => void;
    const staleBlock = new Promise<string>((resolve) => {
      resolveStaleBlock = resolve;
    });
    const bestBlock = new Promise<string>((resolve) => {
      resolveBestBlock = resolve;
    });

    RPCService.store = {
      customRPC: {},
      defaultRPC: {
        [chainServerId]: {
          chainId: chainServerId,
          rpcUrl: [staleRPC, bestRPC],
          txPushToRPC: true,
        },
      },
    };
    RPCService.preferredRPC = {};
    RPCService.rpcProbeTasks = {};

    const request = jest
      .spyOn(RPCService, 'defaultRPCRequest')
      .mockImplementation((url, method) => {
        if (method === 'eth_blockNumber') {
          return url === staleRPC ? staleBlock : bestBlock;
        }
        if (method === 'eth_sendRawTransaction') {
          return Promise.resolve('0xhash');
        }
        return Promise.resolve(url);
      });

    const probe = RPCService.probeBestRPC(chainServerId);

    await expect(
      RPCService.defaultRPCSubmitTxWithFallback(
        chainServerId,
        'eth_sendRawTransaction',
        ['0xraw']
      )
    ).resolves.toEqual(['0xhash', staleRPC]);

    resolveStaleBlock('0xf');
    resolveBestBlock('0x10');
    await probe;

    request.mockClear();

    await expect(
      RPCService.requestDefaultRPC({
        chainServerId,
        method: 'eth_sendRawTransaction',
        params: ['0xraw'],
      })
    ).resolves.toBe('0xhash');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(staleRPC, 'eth_sendRawTransaction', [
      '0xraw',
    ]);

    request.mockClear();

    await expect(
      RPCService.requestDefaultRPC({
        chainServerId,
        method: 'eth_getTransactionReceipt',
        params: ['0xhash'],
      })
    ).resolves.toBe(bestRPC);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(bestRPC, 'eth_getTransactionReceipt', [
      '0xhash',
    ]);
  });

  it('reuses one in-flight probe per chain', async () => {
    const chainServerId = 'chain';
    const firstRPC = 'https://first.example';
    const secondRPC = 'https://second.example';
    let resolveFirstBlock!: (blockNumber: string) => void;
    let resolveSecondBlock!: (blockNumber: string) => void;
    const firstBlock = new Promise<string>((resolve) => {
      resolveFirstBlock = resolve;
    });
    const secondBlock = new Promise<string>((resolve) => {
      resolveSecondBlock = resolve;
    });

    RPCService.store = {
      customRPC: {},
      defaultRPC: {
        [chainServerId]: {
          chainId: chainServerId,
          rpcUrl: [firstRPC, secondRPC],
          txPushToRPC: true,
        },
      },
    };
    RPCService.preferredRPC = {};
    RPCService.rpcProbeTasks = {};

    const request = jest
      .spyOn(RPCService, 'defaultRPCRequest')
      .mockImplementation((url) =>
        url === firstRPC ? firstBlock : secondBlock
      );

    const firstProbe = RPCService.probeBestRPC(chainServerId);
    const reusedProbe = RPCService.probeBestRPC(chainServerId);

    expect(reusedProbe).toBe(firstProbe);
    expect(request).toHaveBeenCalledTimes(2);

    resolveFirstBlock('0x30');
    resolveSecondBlock('0x40');
    await firstProbe;

    const nextProbe = RPCService.probeBestRPC(chainServerId);
    expect(nextProbe).not.toBe(firstProbe);
    await nextProbe;
    expect(request).toHaveBeenCalledTimes(4);
  });
});
