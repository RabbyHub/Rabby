import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  createAccountInfoLoader,
  getAccountInfoLoader,
} from '@/ui/views/HDManager/accountInfo';
import { useQueryAccountsInfo } from '@/ui/views/HDManager/hooks/useQueryAccontsInfo';
import type { Account } from '@/ui/views/HDManager/AccountList';

let mockWallet: any;
jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};
const flushPromises = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const createApi = () => ({
  usedChainList: jest.fn().mockResolvedValue([]),
  getTotalBalance: jest.fn().mockResolvedValue({ total_usd_value: 0 }),
  getAppChainList: jest.fn().mockResolvedValue({ apps: [] }),
});
const appAssets = (netValue: number) => ({
  apps: [
    {
      portfolio_item_list: [
        { stats: { net_usd_value: netValue + 5 } },
        { stats: { net_usd_value: -5 } },
      ],
    },
  ],
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('HD manager account info loader', () => {
  test.each([25, 0, -40])(
    'includes AppChain net assets when total_balance is %s',
    async (evmBalance) => {
      const api = createApi();
      const chains = [
        { id: 'eth', born_at: 300 },
        { id: 'arb', born_at: 100 },
      ];
      api.usedChainList.mockResolvedValue(chains);
      api.getTotalBalance.mockResolvedValue({ total_usd_value: evmBalance });
      api.getAppChainList.mockResolvedValue(appAssets(20));

      await expect(createAccountInfoLoader(api).load('0xAbC')).resolves.toEqual(
        {
          chains,
          firstTxTime: 100,
          balance: evmBalance + 20,
        }
      );
      expect(api.usedChainList).toHaveBeenCalledWith('0xabc');
      expect(api.getTotalBalance).toHaveBeenCalledWith('0xabc');
      expect(api.getAppChainList).toHaveBeenCalledWith('0xabc');
    }
  );

  test('queries both amount APIs for an address with no used chains', async () => {
    const api = createApi();
    api.getAppChainList.mockResolvedValue(appAssets(12));

    await expect(createAccountInfoLoader(api).load('0xabc')).resolves.toEqual({
      chains: [],
      firstTxTime: undefined,
      balance: 12,
    });
    expect(api.getTotalBalance).toHaveBeenCalledTimes(1);
    expect(api.getAppChainList).toHaveBeenCalledTimes(1);
  });

  test('returns the full amount when chain metadata fails and retries missing metadata', async () => {
    const api = createApi();
    api.usedChainList.mockRejectedValueOnce(new Error('Chain lookup failed'));
    api.getTotalBalance.mockResolvedValue({ total_usd_value: 8 });
    api.getAppChainList.mockResolvedValue(appAssets(10));
    const loader = createAccountInfoLoader(api);

    await expect(loader.load('0xabc')).resolves.toMatchObject({ balance: 18 });
    api.usedChainList.mockResolvedValue([{ id: 'eth', born_at: 200 }]);
    await expect(loader.load('0xABC')).resolves.toEqual({
      chains: [{ id: 'eth', born_at: 200 }],
      firstTxTime: 200,
      balance: 18,
    });
    expect(api.usedChainList).toHaveBeenCalledTimes(2);
  });

  test.each(['getTotalBalance', 'getAppChainList'] as const)(
    'keeps a failed %s amount unknown and retries instead of caching a partial total',
    async (method) => {
      const api = createApi();
      api.usedChainList.mockResolvedValue([{ id: 'eth', born_at: 100 }]);
      api.getTotalBalance.mockResolvedValue({ total_usd_value: 6 });
      api.getAppChainList.mockResolvedValue(appAssets(14));
      api[method].mockRejectedValueOnce(new Error('HTTP 429'));
      const loader = createAccountInfoLoader(api);

      await expect(loader.load('0xabc')).resolves.toEqual({
        chains: [{ id: 'eth', born_at: 100 }],
        firstTxTime: 100,
        balance: undefined,
      });
      await expect(loader.load('0xABC')).resolves.toMatchObject({
        balance: 20,
      });
      expect(api[method]).toHaveBeenCalledTimes(2);
      expect(api.usedChainList).toHaveBeenCalledTimes(1);
    }
  );

  test('refreshes an expired amount without extending its TTL when chain metadata recovers later', async () => {
    const api = createApi();
    api.usedChainList.mockRejectedValueOnce(new Error('Chain lookup failed'));
    api.getTotalBalance.mockResolvedValue({ total_usd_value: 8 });
    api.getAppChainList.mockResolvedValue(appAssets(10));
    const loader = createAccountInfoLoader(api);
    await expect(loader.load('0xabc')).resolves.toMatchObject({ balance: 18 });

    jest.advanceTimersByTime(9 * 60 * 1000);
    api.usedChainList.mockResolvedValue([{ id: 'eth', born_at: 200 }]);
    await expect(loader.load('0xabc')).resolves.toMatchObject({
      firstTxTime: 200,
      balance: 18,
    });
    expect(api.getTotalBalance).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2 * 60 * 1000);
    api.getTotalBalance.mockResolvedValue({ total_usd_value: 30 });
    await expect(loader.load('0xabc')).resolves.toMatchObject({
      firstTxTime: 200,
      balance: 40,
    });
    expect(api.getTotalBalance).toHaveBeenCalledTimes(2);
    expect(api.getAppChainList).toHaveBeenCalledTimes(2);
    expect(api.usedChainList).toHaveBeenCalledTimes(2);
  });

  test('caches zero balances across address casing for ten minutes without row metadata', async () => {
    const api = createApi();
    const loader = createAccountInfoLoader(api);
    const first = await loader.load('0xAbC');

    expect(first).toEqual({
      chains: [],
      firstTxTime: undefined,
      balance: 0,
    });
    expect(first).not.toHaveProperty('address');
    expect(first).not.toHaveProperty('index');
    expect(first).not.toHaveProperty('aliasName');
    jest.advanceTimersByTime(10 * 60 * 1000 - 1);
    await expect(loader.load('0xabc')).resolves.toEqual(first);
    expect(api.usedChainList).toHaveBeenCalledTimes(1);
    expect(api.getTotalBalance).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    api.getTotalBalance.mockResolvedValue({ total_usd_value: 3 });
    api.usedChainList.mockResolvedValue([{ id: 'eth', born_at: 123 }]);
    await expect(loader.load('0xABC')).resolves.toEqual({
      chains: [{ id: 'eth', born_at: 123 }],
      firstTxTime: 123,
      balance: 3,
    });
    expect(api.usedChainList).toHaveBeenCalledTimes(2);
    expect(api.getTotalBalance).toHaveBeenCalledTimes(2);
  });

  test('coalesces simultaneous loads of the same normalized address', async () => {
    const api = createApi();
    const balance = deferred<{ total_usd_value: number }>();
    api.getTotalBalance.mockReturnValue(balance.promise);
    const loader = createAccountInfoLoader(api);
    const first = loader.load('0xAbC');
    const second = loader.load('0xABC');
    await flushPromises();

    expect(api.usedChainList).toHaveBeenCalledTimes(1);
    expect(api.getTotalBalance).toHaveBeenCalledTimes(1);
    expect(api.getAppChainList).toHaveBeenCalledTimes(1);
    balance.resolve({ total_usd_value: 7 });
    await expect(first).resolves.toMatchObject({ balance: 7 });
    await expect(second).resolves.toMatchObject({ balance: 7 });
  });

  test('reuses an account info loader for the same wallet only', () => {
    const firstWallet = { openapi: createApi() } as any;
    const secondWallet = { openapi: createApi() } as any;

    expect(getAccountInfoLoader(firstWallet)).toBe(
      getAccountInfoLoader(firstWallet)
    );
    expect(getAccountInfoLoader(secondWallet)).not.toBe(
      getAccountInfoLoader(firstWallet)
    );
  });
});

describe('HD manager account info hook', () => {
  let container: HTMLDivElement;
  let root: Root;
  let hook: ReturnType<typeof useQueryAccountsInfo>;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  const account: Account = {
    address: '0xAbC',
    index: 1,
    aliasName: 'First row',
  };

  const Harness = () => {
    hook = useQueryAccountsInfo();
    return null;
  };
  const render = async () => {
    await act(async () => root.render(createElement(Harness)));
  };

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    mockWallet = { openapi: createApi() };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  test('deduplicates synchronous jobs and uses lowercase state keys', async () => {
    const balance = deferred<{ total_usd_value: number }>();
    mockWallet.openapi.getTotalBalance.mockReturnValue(balance.promise);
    await render();
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await act(async () => {
      first = hook.createQueryAccountJob(account);
      second = hook.createQueryAccountJob({ ...account, address: '0xABC' });
      await flushPromises();
    });

    expect(hook.pendingMap).toEqual({ '0xabc': true });
    expect(mockWallet.openapi.usedChainList).toHaveBeenCalledTimes(1);
    expect(mockWallet.openapi.getTotalBalance).toHaveBeenCalledTimes(1);
    await act(async () => {
      balance.resolve({ total_usd_value: 11 });
      await Promise.all([first, second]);
    });
    expect(hook.pendingMap).toEqual({ '0xabc': false });
    expect(Object.keys(hook.accountsMap)).toEqual(['0xabc']);
    expect(hook.accountsMap['0xabc']).toMatchObject({ balance: 11, index: 1 });
  });

  test('hydrates a remounted hook from cached metadata using the current row fields', async () => {
    mockWallet.openapi.getTotalBalance.mockResolvedValue({
      total_usd_value: 9,
    });
    await render();
    await act(async () => {
      await hook.createQueryAccountJob(account);
    });
    await act(async () => root.render(null));
    await render();
    expect(hook.accountsMap).toEqual({});

    await act(async () => {
      await hook.createQueryAccountJob({
        address: '0xABC',
        index: 99,
        aliasName: 'Updated row',
      });
    });
    expect(hook.accountsMap['0xabc']).toMatchObject({
      index: 99,
      aliasName: 'Updated row',
      balance: 9,
    });
    expect(mockWallet.openapi.usedChainList).toHaveBeenCalledTimes(1);
    expect(mockWallet.openapi.getTotalBalance).toHaveBeenCalledTimes(1);
    expect(mockWallet.openapi.getAppChainList).toHaveBeenCalledTimes(1);
  });

  test('retries an unavailable balance when the same row enters again', async () => {
    mockWallet.openapi.getAppChainList.mockRejectedValueOnce(
      new Error('HTTP 429')
    );
    mockWallet.openapi.getTotalBalance.mockResolvedValue({
      total_usd_value: 4,
    });
    await render();
    await act(async () => {
      await hook.createQueryAccountJob(account);
    });
    expect(hook.accountsMap['0xabc'].balance).toBeUndefined();

    await act(async () => {
      await hook.createQueryAccountJob(account);
    });
    expect(hook.accountsMap['0xabc'].balance).toBe(4);
    expect(mockWallet.openapi.getAppChainList).toHaveBeenCalledTimes(2);
  });
});
