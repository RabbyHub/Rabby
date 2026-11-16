const mockGetApproval = jest.fn();
const mockGetCurrentAccount = jest.fn();
const mockGetConnectedSite = jest.fn();
let mockUnlocked = true;
const mockLockListeners = new Set<(state: { isUnlocked: boolean }) => void>();
jest.mock('background/service', () => ({
  notificationService: { getApproval: mockGetApproval },
  preferenceService: {
    getCurrentAccount: mockGetCurrentAccount,
    getPreference: () => true,
  },
  permissionService: { getConnectedSite: mockGetConnectedSite },
  keyringService: {
    isUnlocked: () => mockUnlocked,
    memStore: {
      subscribe: (fn: (state: { isUnlocked: boolean }) => void) =>
        mockLockListeners.add(fn),
      unsubscribe: (fn: (state: { isUnlocked: boolean }) => void) =>
        mockLockListeners.delete(fn),
    },
  },
}));

jest.mock('@/constant', () => ({
  CUSTOM_RPC_ENABLED: false,
  EVENTS: { broadcastToUI: 'broadcastToUI' },
}));

jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
  updateChainStore: jest.fn(),
}));

jest.mock('@/ui/utils/token', () => ({
  customTestnetTokenToTokenItem: jest.fn((token) => token),
}));

jest.mock('@/background/utils', () => ({ createPersistStore: jest.fn() }));
jest.mock('@/background/utils/http', () => ({ http: { post: jest.fn() } }));
jest.mock('@/background/utils/ipfs', () => ({
  getFormattedIpfsUrl: jest.fn(),
}));
jest.mock('@/background/webapi', () => ({ storage: {} }));
jest.mock('@/background/service/rpc', () => ({
  __esModule: true,
  default: { hasCustomRPC: () => false },
}));

jest.mock('viem/actions', () => ({
  getTransactionReceipt: jest.fn(),
  getBlock: jest.fn(),
  getGasPrice: jest.fn(),
  estimateMaxPriorityFeePerGas: jest.fn(),
}));

import type { TransactionReceipt } from 'viem';
import {
  estimateMaxPriorityFeePerGas,
  getBlock,
  getGasPrice,
  getTransactionReceipt,
} from 'viem/actions';
import { findChain } from '@/utils/chain';
import { http as axios } from '@/background/utils/http';
import { addCustomTestnetFromApproval } from '@/background/controller/walletUtils/addChain';
import eventBus from '@/eventBus';
import type { ApprovalRef } from '@/background/service/notification';
import {
  createTestnetChain,
  customTestnetService,
} from '@/background/service/customTestnet';

const hash = `0x${'ab'.repeat(32)}` as const;
const chain = createTestnetChain({
  id: 123456,
  name: 'Custom network',
  nativeTokenSymbol: 'ETH',
  rpcUrl: 'https://rpc.example',
});

describe('custom network writes are bound to active approval', () => {
  const account = {
    address: '0xaaa',
    type: 'HD Key Tree',
    brandName: 'HD Key Tree',
  };
  const origin = 'https://dapp.example';
  const post = axios.post as jest.Mock;
  let approval: any;
  let site: any;
  const ref = (): ApprovalRef => ({
    id: approval.id,
    component: approval.data.approvalComponent,
  });
  const deferredRpc = () => {
    let finish!: (value: any) => void;
    post.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve))
    );
    return () => finish({ data: { result: chain.hex } });
  };
  const expectNoWrites = () => {
    expect(customTestnetService.store.customTestnet).toEqual({});
    expect(customTestnetService.chains).toEqual({});
    expect(customTestnetService.syncChainList).not.toHaveBeenCalled();
    expect(customTestnetService.detectEip1559).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnlocked = true;
    approval = {
      id: 'network-request',
      data: {
        approvalComponent: 'AddChain',
        origin,
        params: { data: [{ chainId: chain.hex }] },
      },
    };
    site = { account, chain: 'ETH', isConnected: true };
    mockGetApproval.mockImplementation(() => approval);
    mockGetConnectedSite.mockImplementation(() => site);
    mockGetCurrentAccount.mockReturnValue(account);
    jest.mocked(findChain).mockReturnValue(undefined);
    post.mockResolvedValue({ data: { result: chain.hex } });
    customTestnetService.store.customTestnet = {};
    customTestnetService.chains = {};
    jest.spyOn(customTestnetService, 'syncChainList');
    jest
      .spyOn(customTestnetService, 'detectEip1559')
      .mockResolvedValue(undefined);
  });
  afterEach(() => {
    expect(mockLockListeners.size).toBe(0);
    expect(eventBus.events.broadcastToUI || []).toHaveLength(0);
    jest.restoreAllMocks();
  });

  test.each(['AddChain', 'SwitchChain'])(
    'adds and initializes a network with an active %s approval',
    async (component) => {
      approval.data.approvalComponent = component;
      await expect(
        addCustomTestnetFromApproval(chain, ref())
      ).resolves.toMatchObject({ id: chain.id, rpcUrl: chain.rpcUrl });
      expect(customTestnetService.store.customTestnet[chain.id]).toBeDefined();
      expect(customTestnetService.getClient(chain.id)).toBeDefined();
      expect(customTestnetService.syncChainList).toHaveBeenCalledTimes(1);
      expect(customTestnetService.detectEip1559).toHaveBeenCalledWith(chain.id);
    }
  );

  test.each(['cancel', 'close', 'replacement'])(
    'does not install a network after %s while the RPC is pending',
    async (action) => {
      const finish = deferredRpc();
      const pending = addCustomTestnetFromApproval(chain, ref());
      expect(post).toHaveBeenCalledTimes(1);
      approval =
        action === 'replacement'
          ? { ...approval, id: 'another-request' }
          : null;
      finish();
      await expect(pending).rejects.toMatchObject({ code: 4001 });
      expectNoWrites();
    }
  );

  test('locking and unlocking cannot revive a pending network write', async () => {
    const finish = deferredRpc();
    const pending = addCustomTestnetFromApproval(chain, ref());
    mockUnlocked = false;
    mockLockListeners.forEach((fn) => fn({ isUnlocked: false }));
    mockUnlocked = true;
    finish();
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expectNoWrites();
  });

  test.each(['global account', 'site account', 'chain', 'connection'])(
    'changing %s away and back cannot revive consent',
    async (change) => {
      const finish = deferredRpc();
      const pending = addCustomTestnetFromApproval(chain, ref());
      if (change === 'global account')
        mockGetCurrentAccount.mockReturnValue({ ...account, address: '0xbbb' });
      if (change === 'site account')
        site.account = { ...account, address: '0xbbb' };
      if (change === 'chain') site.chain = 'BSC';
      if (change === 'connection') site = undefined;
      eventBus.emit('broadcastToUI');
      site = { account, chain: 'ETH', isConnected: true };
      mockGetCurrentAccount.mockReturnValue(account);
      eventBus.emit('broadcastToUI');
      finish();
      await expect(pending).rejects.toMatchObject({ code: 4001 });
      expectNoWrites();
    }
  );

  test('ignores unrelated metadata updates and does not change the reviewed form after dispatch', async () => {
    const values = { ...chain };
    const finish = deferredRpc();
    const pending = addCustomTestnetFromApproval(values, ref());
    site = { ...site, isTop: true };
    mockGetCurrentAccount.mockReturnValue({ ...account, balance: 100 });
    eventBus.emit('broadcastToUI');
    values.name = 'Changed after dispatch';
    finish();
    await expect(pending).resolves.toMatchObject({ name: chain.name });
  });

  test.each([
    'missing ref',
    'wrong id',
    'wrong component',
    'unsupported component',
    'missing approval',
    'wrong chain',
    'locked',
  ])('rejects %s before RPC validation', async (change) => {
    let reference = ref();
    if (change === 'wrong id')
      reference = { ...reference, id: 'other-request' };
    if (change === 'wrong component')
      reference = { ...reference, component: 'SwitchChain' };
    if (change === 'unsupported component') {
      reference = { ...reference, component: 'SignText' };
      approval.data.approvalComponent = 'SignText';
    }
    if (change === 'missing approval') approval = null;
    if (change === 'wrong chain') approval.data.params.data[0].chainId = '0x1';
    if (change === 'locked') mockUnlocked = false;
    await expect(
      addCustomTestnetFromApproval(
        chain,
        change === 'missing ref' ? (undefined as any) : reference
      )
    ).rejects.toMatchObject({ code: 4001 });
    expect(post).not.toHaveBeenCalled();
    expectNoWrites();
  });

  test.each(['mismatched chain', 'unavailable RPC', 'existing chain'])(
    'preserves validation errors for %s',
    async (failure) => {
      if (failure === 'mismatched chain')
        post.mockResolvedValue({ data: { result: '0x1' } });
      if (failure === 'unavailable RPC')
        post.mockRejectedValue(new Error('offline'));
      if (failure === 'existing chain')
        jest.mocked(findChain).mockReturnValue(chain);
      await expect(
        addCustomTestnetFromApproval(chain, ref())
      ).resolves.toHaveProperty('error');
      expectNoWrites();
    }
  );

  test('keeps manual add and edit available without a dapp approval', async () => {
    approval = null;
    await expect(
      customTestnetService.add({ ...chain })
    ).resolves.toMatchObject({ id: chain.id });
    await expect(
      customTestnetService.update({ ...chain, name: 'Edited' })
    ).resolves.toMatchObject({ name: 'Edited' });
  });
});

describe('customTestnetService.getTx receipt status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(findChain).mockReturnValue(chain);
    jest
      .spyOn(customTestnetService, 'getClient')
      .mockReturnValue({} as ReturnType<typeof customTestnetService.getClient>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['success', 1],
    ['reverted', 0],
  ] as const)(
    'preserves a mined %s receipt as status %i',
    async (status, expectedStatus) => {
      jest.mocked(getTransactionReceipt).mockResolvedValue({
        transactionHash: hash,
        status,
        gasUsed: 21000n,
      } as TransactionReceipt);

      await expect(
        customTestnetService.getTx({ chainId: chain.id, hash })
      ).resolves.toMatchObject({
        hash,
        code: 0,
        status: expectedStatus,
        gas_used: 21000,
      });
    }
  );

  it('keeps an unavailable receipt unresolved instead of completing the transaction', async () => {
    jest
      .mocked(getTransactionReceipt)
      .mockRejectedValue(new Error('Receipt unavailable'));

    await expect(
      customTestnetService.getTx({ chainId: chain.id, hash })
    ).resolves.toMatchObject({
      hash,
      code: -1,
      status: 0,
      gas_used: 0,
    });
  });
});

const GWEI = 1_000_000_000;

describe('customTestnetService EIP-1559 detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    customTestnetService.store.customTestnet = { [chain.id]: chain };
    customTestnetService.store.eip1559 = {};
    jest
      .spyOn(customTestnetService, 'getClient')
      .mockReturnValue({} as ReturnType<typeof customTestnetService.getClient>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const listedEip1559 = () =>
    customTestnetService.getList().find((item) => item.id === chain.id)?.eip[
      '1559'
    ];

  it('defaults to legacy before detection', () => {
    expect(listedEip1559()).toBe(false);
  });

  it.each([
    ['a block with baseFeePerGas', { baseFeePerGas: 0n }, true],
    ['a block without baseFeePerGas', { baseFeePerGas: null }, false],
  ])('marks %s', async (_name, block, expected) => {
    jest.mocked(getBlock).mockResolvedValue(block as any);

    await customTestnetService.detectEip1559(chain.id);

    expect(customTestnetService.store.eip1559[chain.id].supported).toBe(
      expected
    );
    expect(listedEip1559()).toBe(expected);
  });

  it('keeps the previous result when the RPC fails', async () => {
    customTestnetService.store.eip1559 = {
      [chain.id]: { supported: true, checkedAt: 1 },
    };
    jest.mocked(getBlock).mockRejectedValue(new Error('RPC down'));

    await customTestnetService.detectEip1559(chain.id);

    expect(customTestnetService.store.eip1559[chain.id]).toEqual({
      supported: true,
      checkedAt: 1,
    });
  });

  it('forgets the result when the network is removed', () => {
    customTestnetService.store.eip1559 = {
      [chain.id]: { supported: true, checkedAt: 1 },
    };

    customTestnetService.remove(chain.id);

    expect(customTestnetService.store.eip1559).toEqual({});
  });
});

describe('customTestnetService.getGasMarket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    customTestnetService.store.eip1559 = {};
    jest
      .spyOn(customTestnetService, 'getClient')
      .mockReturnValue({} as ReturnType<typeof customTestnetService.getClient>);
    jest.mocked(getGasPrice).mockResolvedValue(BigInt(10 * GWEI));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const pick = (
    levels: Awaited<ReturnType<typeof customTestnetService.getGasMarket>>
  ) =>
    levels.map(({ level, price, priority_price, base_fee }) => ({
      level,
      price,
      priority_price,
      base_fee,
    }));

  it('splits baseFee and tip on an EIP-1559 network', async () => {
    customTestnetService.store.eip1559 = {
      [chain.id]: { supported: true, checkedAt: 1 },
    };
    jest
      .mocked(getBlock)
      .mockResolvedValue({ baseFeePerGas: BigInt(10 * GWEI) } as any);
    jest.mocked(estimateMaxPriorityFeePerGas).mockResolvedValue(BigInt(GWEI));

    const levels = await customTestnetService.getGasMarket({
      chainId: chain.id,
      custom: 5 * GWEI,
    });

    expect(pick(levels)).toEqual([
      {
        level: 'slow',
        price: 13 * GWEI,
        priority_price: GWEI,
        base_fee: 10 * GWEI,
      },
      {
        level: 'normal',
        price: 16 * GWEI,
        priority_price: GWEI,
        base_fee: 10 * GWEI,
      },
      {
        level: 'fast',
        price: 21.5 * GWEI,
        priority_price: 1.5 * GWEI,
        base_fee: 10 * GWEI,
      },
      {
        level: 'custom',
        price: 5 * GWEI,
        priority_price: GWEI,
        base_fee: 10 * GWEI,
      },
    ]);
  });

  it('falls back to eth_gasPrice with maxFee == tip when estimation fails', async () => {
    customTestnetService.store.eip1559 = {
      [chain.id]: { supported: true, checkedAt: 1 },
    };
    jest.mocked(getBlock).mockRejectedValue(new Error('RPC down'));
    jest.mocked(estimateMaxPriorityFeePerGas).mockResolvedValue(BigInt(GWEI));

    const levels = await customTestnetService.getGasMarket({
      chainId: chain.id,
    });

    expect(levels.map((item) => item.price)).toEqual([
      11 * GWEI,
      12 * GWEI,
      12.5 * GWEI,
      0,
    ]);
    levels.forEach((item) => expect(item.priority_price).toBe(item.price));
  });

  it('keeps the legacy market on a network without EIP-1559', async () => {
    const levels = await customTestnetService.getGasMarket({
      chainId: chain.id,
    });

    expect(getBlock).not.toHaveBeenCalled();
    expect(levels.map((item) => item.priority_price)).toEqual([
      9.4 * GWEI,
      9.7 * GWEI,
      9.8 * GWEI,
      0,
    ]);
  });
});
