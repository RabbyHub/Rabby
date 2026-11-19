import { createAddressBalanceLoader } from '@/ui/utils/addressBalanceLoader';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flushPromises = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};

const createApi = () => ({
  getTotalBalance: jest
    .fn()
    .mockResolvedValue({ total_usd_value: 0, chain_list: [] }),
  getAppChainList: jest.fn().mockResolvedValue({ apps: [] }),
});

describe('address balance loader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test.each([0, 25])(
    'adds AppChain net assets when the EVM balance is %s',
    async (evmBalance) => {
      const api = createApi();
      api.getTotalBalance.mockResolvedValue({
        total_usd_value: evmBalance,
        chain_list: [],
      });
      api.getAppChainList.mockResolvedValue({
        apps: [
          {
            portfolio_item_list: [
              { stats: { net_usd_value: 20 } },
              { stats: { net_usd_value: -5 } },
            ],
          },
          { portfolio_item_list: [{ stats: { net_usd_value: 7 } }] },
        ],
      });

      await expect(createAddressBalanceLoader(api).load('0xAbC')).resolves.toBe(
        evmBalance + 22
      );
      expect(api.getTotalBalance).toHaveBeenCalledWith('0xabc');
      expect(api.getAppChainList).toHaveBeenCalledWith('0xabc');
    }
  );

  test('caches zero across address casing and reloads after ten minutes', async () => {
    const api = createApi();
    const loader = createAddressBalanceLoader(api);

    await expect(loader.load('0xAbC')).resolves.toBe(0);
    jest.advanceTimersByTime(10 * 60 * 1000 - 1);
    await expect(loader.load('0xabc')).resolves.toBe(0);
    expect(api.getTotalBalance).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    api.getTotalBalance.mockResolvedValue({ total_usd_value: 12 });
    await expect(loader.load('0xABC')).resolves.toBe(12);
    expect(api.getTotalBalance).toHaveBeenCalledTimes(2);
    expect(api.getAppChainList).toHaveBeenCalledTimes(2);
  });

  test.each(['getTotalBalance', 'getAppChainList'] as const)(
    'does not cache a partial balance when %s fails',
    async (method) => {
      const api = createApi();
      api.getTotalBalance.mockResolvedValue({ total_usd_value: 10 });
      api[method].mockRejectedValueOnce(new Error('Request failed'));
      const loader = createAddressBalanceLoader(api);

      await expect(loader.load('0xabc')).rejects.toThrow('Request failed');
      await expect(loader.load('0xabc')).resolves.toBe(10);
      expect(api.getTotalBalance).toHaveBeenCalledTimes(2);
      expect(api.getAppChainList).toHaveBeenCalledTimes(2);
    }
  );

  test('deduplicates in-flight loads without canceling another subscriber', async () => {
    const api = createApi();
    const totalBalance = deferred<{ total_usd_value: number }>();
    api.getTotalBalance.mockReturnValue(totalBalance.promise);
    const loader = createAddressBalanceLoader(api);
    const controller = new AbortController();
    const first = loader.load('0xAbC', controller.signal);
    const firstResult = expect(first).rejects.toMatchObject({
      name: 'AbortError',
    });
    const second = loader.load('0xabc');
    await flushPromises();

    controller.abort();
    totalBalance.resolve({ total_usd_value: 19 });

    await firstResult;
    await expect(second).resolves.toBe(19);
    await expect(loader.load('0xABC')).resolves.toBe(19);
    expect(api.getTotalBalance).toHaveBeenCalledTimes(1);
    expect(api.getAppChainList).toHaveBeenCalledTimes(1);
  });

  test('limits concurrent HTTP requests to two', async () => {
    const api = createApi();
    const gate = deferred<void>();
    let active = 0;
    let maxActive = 0;
    const request = async <T>(response: T) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await gate.promise;
      active--;
      return response;
    };
    api.getTotalBalance.mockImplementation(() =>
      request({ total_usd_value: 0 })
    );
    api.getAppChainList.mockImplementation(() => request({ apps: [] }));
    const loader = createAddressBalanceLoader(api);
    const balances = Promise.all([loader.load('0x1'), loader.load('0x2')]);
    await flushPromises();
    expect(active).toBe(2);
    expect(api.getTotalBalance).toHaveBeenCalledTimes(1);
    expect(api.getAppChainList).toHaveBeenCalledTimes(1);

    gate.resolve();
    await balances;
    expect(maxActive).toBe(2);
  });

  test('starts at most five HTTP requests in each one-second interval', async () => {
    const api = createApi();
    const loader = createAddressBalanceLoader(api);
    const balances = Promise.all([
      loader.load('0x1'),
      loader.load('0x2'),
      loader.load('0x3'),
    ]);
    const requestCount = () =>
      api.getTotalBalance.mock.calls.length +
      api.getAppChainList.mock.calls.length;

    await flushPromises();
    expect(requestCount()).toBe(5);
    jest.advanceTimersByTime(999);
    await flushPromises();
    expect(requestCount()).toBe(5);
    jest.advanceTimersByTime(1);
    await balances;
    expect(requestCount()).toBe(6);
  });

  test('skips queued requests after leaving view and lets a new subscription load', async () => {
    const api = createApi();
    const totalBalance = deferred<{ total_usd_value: number }>();
    const appChain = deferred<{ apps: [] }>();
    api.getTotalBalance.mockReturnValueOnce(totalBalance.promise);
    api.getAppChainList.mockReturnValueOnce(appChain.promise);
    const loader = createAddressBalanceLoader(api);
    const blocker = loader.load('0xfirst');
    const controller = new AbortController();
    const canceled = loader.load('0xsecond', controller.signal);
    const canceledResult = expect(canceled).rejects.toMatchObject({
      name: 'AbortError',
    });
    await flushPromises();
    controller.abort();
    const replacement = loader.load('0xSECOND');

    totalBalance.resolve({ total_usd_value: 0 });
    appChain.resolve({ apps: [] });
    await flushPromises();
    jest.advanceTimersByTime(1000);

    await canceledResult;
    await blocker;
    await expect(replacement).resolves.toBe(0);
    expect(api.getTotalBalance.mock.calls).toEqual([['0xfirst'], ['0xsecond']]);
    expect(api.getAppChainList.mock.calls).toEqual([['0xfirst'], ['0xsecond']]);
  });

  test('keeps an already-started pair reusable when its row leaves and returns', async () => {
    const api = createApi();
    const totalBalance = deferred<{ total_usd_value: number }>();
    api.getTotalBalance.mockReturnValueOnce(totalBalance.promise);
    const loader = createAddressBalanceLoader(api);
    const controller = new AbortController();
    const canceled = loader.load('0xabc', controller.signal);
    const canceledResult = expect(canceled).rejects.toMatchObject({
      name: 'AbortError',
    });
    await flushPromises();
    controller.abort();
    const returned = loader.load('0xABC');
    totalBalance.resolve({ total_usd_value: 99 });
    await flushPromises();

    await canceledResult;
    await expect(returned).resolves.toBe(99);
    await expect(loader.load('0xabc')).resolves.toBe(99);
    expect(api.getTotalBalance).toHaveBeenCalledTimes(1);
  });

  test('canceled queued rows do not spend rate slots ahead of visible rows', async () => {
    const api = createApi();
    const totalBalance = deferred<{ total_usd_value: number }>();
    const appChain = deferred<{ apps: [] }>();
    api.getTotalBalance.mockReturnValueOnce(totalBalance.promise);
    api.getAppChainList.mockReturnValueOnce(appChain.promise);
    const loader = createAddressBalanceLoader(api);
    const blocker = loader.load('0xfirst');
    const controllers = Array.from({ length: 20 }, () => new AbortController());
    const canceled = controllers.map((controller, index) =>
      loader
        .load(`0xoffscreen${index}`, controller.signal)
        .catch((error) => error)
    );
    await flushPromises();
    controllers.forEach((controller) => controller.abort());
    const visible = loader.load('0xvisible');

    totalBalance.resolve({ total_usd_value: 0 });
    appChain.resolve({ apps: [] });

    await blocker;
    await expect(visible).resolves.toBe(0);
    expect(await Promise.all(canceled)).toEqual(
      Array.from({ length: 20 }, () =>
        expect.objectContaining({ name: 'AbortError' })
      )
    );
    expect(api.getTotalBalance.mock.calls).toEqual([
      ['0xfirst'],
      ['0xvisible'],
    ]);
    expect(api.getAppChainList.mock.calls).toEqual([
      ['0xfirst'],
      ['0xvisible'],
    ]);
  });
});
