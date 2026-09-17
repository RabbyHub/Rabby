import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { getDefaultPerpsState, usePerpsStore } from '@/ui/state/perps';
import { wallet } from '@/ui/wallet';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import {
  fetchAllDexsRaw,
  formatAllDexsClearinghouseState,
} from '@/ui/views/DesktopPerps/utils';
import { UserAbstractionResp } from '@rabby-wallet/hyperliquid-sdk';

jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('@/ui/utils', () => ({
  isSameAddress: (left: string, right: string) =>
    left.toLowerCase() === right.toLowerCase(),
  // Real `sleep` would add real 500ms delays between retry attempts; the
  // retry tests only care that it was awaited between attempts, not that it
  // actually waits.
  sleep: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/ui/views/Perps/sdkManager', () => ({
  getPerpsSDK: jest.fn(),
  destroyPerpsSDK: jest.fn(),
}));

jest.mock('@/ui/views/Perps/utils', () => ({
  formatMarkData: jest.fn(),
  getPxDecimals: jest.fn(),
}));

jest.mock('@/ui/views/DesktopPerps/utils', () => ({
  fetchAllDexsRaw: jest.fn(),
  formatAllDexsClearinghouseState: jest.fn(),
  formatSpotState: jest.fn(),
  getCachedPerpDexs: jest.fn(),
  handleUpdateHistoricalOrders: jest.fn(),
  handleUpdateTwapSliceFills: jest.fn(),
  showDepositAndWithdrawToast: jest.fn(),
}));

jest.mock('@/stats', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getMarketSlippage: jest.fn(),
    getPerpsCandleInterval: jest.fn(),
    getPerpsFavoritedCoins: jest.fn(),
    getPerpsMarginModePreferences: jest.fn(),
    getPerpsOrderConfirmations: jest.fn(),
    getPerpsQuoteUnit: jest.fn(),
    getPerpsSelectedCoin: jest.fn(),
    getPerpsShowPopularTradings: jest.fn(),
    getPerpsTpslModePreferences: jest.fn(),
    getSkipMarketCloseConfirm: jest.fn(),
    getSoundEnabled: jest.fn(),
    setMarketSlippage: jest.fn(),
    setPerpsOrderConfirmation: jest.fn(),
    setPerpsShowPopularTradings: jest.fn(),
    openapi: {},
  },
}));

describe('perps store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePerpsStore.setState(getDefaultPerpsState());
  });

  test('keeps realtime and trading state in a non-persisted UI store', () => {
    expect(usePerpsStore.getState()).toMatchObject({
      currentPerpsAccount: null,
      marketData: [],
      wsSubscriptions: [],
      selectedCoin: 'BTC',
      marketSlippage: 0.05,
      quoteUnit: 'base',
      sizeDisplayUnit: 'base',
    });
    expect('persist' in usePerpsStore).toBe(false);
  });

  test('resets the trading form when the selected coin changes', () => {
    usePerpsStore.getState().patchState({
      tradingPositionSize: { amount: '1', notionalValue: '100' },
      tradingPercentage: 50,
      tradingReduceOnly: true,
    });

    usePerpsStore.getState().setSelectedCoin('ETH');

    expect(usePerpsStore.getState()).toMatchObject({
      selectedCoin: 'ETH',
      tradingPositionSize: { amount: '', notionalValue: '' },
      tradingPercentage: 0,
      tradingReduceOnly: false,
    });
  });

  test('does not add a pending history item already confirmed by websocket', () => {
    usePerpsStore.setState({
      userAccountHistory: [
        {
          time: 20,
          hash: 'confirmed',
          type: 'deposit',
          status: 'success',
          usdValue: '10',
        },
      ],
    });

    usePerpsStore.getState().setLocalLoadingHistory([
      {
        time: 10,
        hash: 'pending',
        type: 'deposit',
        status: 'pending',
        usdValue: '10',
      },
    ]);

    expect(usePerpsStore.getState().localLoadingHistory).toEqual([]);
  });

  test('optimistically clamps and persists market slippage', async () => {
    (wallet.setMarketSlippage as jest.Mock).mockResolvedValue(undefined);

    await usePerpsStore.getState().updateMarketSlippage(2);

    expect(usePerpsStore.getState().marketSlippage).toBe(1);
    expect(wallet.setMarketSlippage).toHaveBeenCalledWith(1);
  });

  test('updates order confirmation before persisting it', async () => {
    (wallet.setPerpsOrderConfirmation as jest.Mock).mockResolvedValue(
      undefined
    );

    await usePerpsStore.getState().updateOrderConfirmation({
      type: 'market',
      enabled: false,
    });

    expect(usePerpsStore.getState().orderConfirmations.market).toBe(false);
    expect(wallet.setPerpsOrderConfirmation).toHaveBeenCalledWith(
      'market',
      false
    );
  });

  test('loads persisted preferences through the background domain methods', async () => {
    (wallet.getPerpsFavoritedCoins as jest.Mock).mockResolvedValue([
      'BTC',
      'ETH',
    ]);

    await usePerpsStore.getState().initFavoritedCoins();

    expect(usePerpsStore.getState().favoritedCoins).toEqual(['BTC', 'ETH']);
  });

  test('unsubscribes realtime listeners and resets account state on logout', () => {
    const unsubscribe = jest.fn();
    usePerpsStore.setState({
      currentPerpsAccount: {
        address: '0xabc',
        type: 'Simple Key Pair',
        brandName: 'Rabby',
      },
      isLogin: true,
      wsSubscriptions: [unsubscribe],
    });

    usePerpsStore.getState().logout();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(usePerpsStore.getState()).toMatchObject({
      currentPerpsAccount: null,
      isLogin: false,
      wsSubscriptions: [],
    });
  });

  const accountA = {
    address: '0xaaa',
    type: 'Simple Key Pair',
    brandName: 'Rabby',
  };
  const accountB = {
    address: '0xbbb',
    type: 'Simple Key Pair',
    brandName: 'Rabby',
  };

  test('drops a staking response that resolves after the account switched away', async () => {
    let resolveSummary: (value: unknown) => void = () => {};
    const summaryPromise = new Promise((resolve) => {
      resolveSummary = resolve;
    });
    const getDelegatorSummary = jest.fn().mockReturnValue(summaryPromise);
    (getPerpsSDK as jest.Mock).mockReturnValue({
      info: { getDelegatorSummary },
    });

    usePerpsStore.getState().setCurrentPerpsAccount(accountA);

    const fetchPromise = usePerpsStore
      .getState()
      .fetchStakingSummary(accountA.address);

    // Account switches away while the request for A is still in flight.
    usePerpsStore.getState().setCurrentPerpsAccount(accountB);

    resolveSummary({
      delegated: '10',
      undelegated: '5',
      totalPendingWithdrawal: '0',
    });
    await fetchPromise;

    expect(usePerpsStore.getState().stakingSummary).toBeNull();
  });

  test('single-flights concurrent staking requests for the same address', async () => {
    const getDelegatorSummary = jest.fn().mockResolvedValue({
      delegated: '1',
      undelegated: '0',
      totalPendingWithdrawal: '0',
    });
    (getPerpsSDK as jest.Mock).mockReturnValue({
      info: { getDelegatorSummary },
    });
    usePerpsStore.getState().setCurrentPerpsAccount(accountA);

    await Promise.all([
      usePerpsStore.getState().fetchStakingSummary(accountA.address),
      usePerpsStore.getState().fetchStakingSummary(accountA.address),
    ]);

    expect(getDelegatorSummary).toHaveBeenCalledTimes(1);
  });

  test('does not downgrade stakingStatus from success on a later failure', async () => {
    const getDelegatorSummary = jest
      .fn()
      .mockResolvedValueOnce({
        delegated: '1',
        undelegated: '0',
        totalPendingWithdrawal: '0',
      })
      .mockRejectedValueOnce(new Error('boom'));
    (getPerpsSDK as jest.Mock).mockReturnValue({
      info: { getDelegatorSummary },
    });
    usePerpsStore.getState().setCurrentPerpsAccount(accountA);

    await usePerpsStore.getState().fetchStakingSummary(accountA.address);
    expect(usePerpsStore.getState().stakingStatus).toBe('success');

    await usePerpsStore.getState().fetchStakingSummary(accountA.address);
    expect(usePerpsStore.getState().stakingStatus).toBe('success');
  });

  test('clears the single-flight key after a thrown error so a later call retries', async () => {
    const getDelegatorSummary = jest.fn().mockRejectedValue(new Error('boom'));
    (getPerpsSDK as jest.Mock).mockReturnValue({
      info: { getDelegatorSummary },
    });
    usePerpsStore.getState().setCurrentPerpsAccount(accountA);

    await usePerpsStore.getState().fetchStakingSummary(accountA.address);
    await usePerpsStore.getState().fetchStakingSummary(accountA.address);

    expect(getDelegatorSummary).toHaveBeenCalledTimes(2);
  });

  test('does not flip an already-loaded portfolio entry back to loading during a background refresh', async () => {
    const address = accountA.address;
    const key = address.toLowerCase();
    usePerpsStore.getState().patchPortfolioEntry({
      key,
      data: {
        day: {
          accountValueHistory: [[1, '100']],
          pnlHistory: [[1, '0']],
          vlm: '0',
        },
      },
      status: 'success',
      updatedAt: 0,
    });

    let resolveRaw: (value: unknown) => void = () => {};
    const rawPromise = new Promise((resolve) => {
      resolveRaw = resolve;
    });
    const getPortfolio = jest.fn().mockReturnValue(rawPromise);
    (getPerpsSDK as jest.Mock).mockReturnValue({ info: { getPortfolio } });

    const fetchPromise = usePerpsStore
      .getState()
      .fetchPerpsPortfolio({ address, force: true });

    // The effect only suspends at `await sdk.info.getPortfolio(...)` — by now
    // its synchronous portion already ran, and since data already existed it
    // must not have dispatched a loading state.
    expect(usePerpsStore.getState().portfolioMap[key]?.status).toBe('success');

    resolveRaw([
      [
        'day',
        {
          accountValueHistory: [[2, '110']],
          pnlHistory: [[2, '0']],
          vlm: '0',
        },
      ],
    ]);
    await fetchPromise;

    expect(usePerpsStore.getState().portfolioMap[key]?.status).toBe('success');
  });

  test('retries a failed portfolio fetch and succeeds on the 3rd attempt', async () => {
    const address = accountA.address;
    const key = address.toLowerCase();
    const getPortfolio = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([
        [
          'day',
          {
            accountValueHistory: [[1, '100']],
            pnlHistory: [[1, '0']],
            vlm: '0',
          },
        ],
      ]);
    (getPerpsSDK as jest.Mock).mockReturnValue({ info: { getPortfolio } });

    await usePerpsStore.getState().fetchPerpsPortfolio({ address });

    expect(getPortfolio).toHaveBeenCalledTimes(3);
    const entry = usePerpsStore.getState().portfolioMap[key];
    expect(entry?.status).toBe('success');
    expect(entry?.data).not.toBeNull();
  });

  test('gives up after 3 failed attempts and reports error with no data', async () => {
    const address = accountA.address;
    const key = address.toLowerCase();
    const getPortfolio = jest.fn().mockRejectedValue(new Error('network'));
    (getPerpsSDK as jest.Mock).mockReturnValue({ info: { getPortfolio } });

    await usePerpsStore.getState().fetchPerpsPortfolio({ address });

    expect(getPortfolio).toHaveBeenCalledTimes(3);
    const entry = usePerpsStore.getState().portfolioMap[key];
    expect(entry?.status).toBe('error');
    expect(entry?.data).toBeNull();
  });

  test('registers logout handling on the shared event bus', () => {
    usePerpsStore.getState().initEventBus();

    expect(eventBus.addEventListener).toHaveBeenCalledWith(
      EVENTS.PERPS.LOG_OUT,
      expect.any(Function)
    );

    const logoutListener = (eventBus.addEventListener as jest.Mock).mock.calls.find(
      ([event]) => event === EVENTS.PERPS.LOG_OUT
    )?.[1];
    usePerpsStore.setState({ isLogin: true });
    logoutListener();

    expect(usePerpsStore.getState().isLogin).toBe(false);
  });

  describe('fetchUserAbstraction address guard', () => {
    test('does not drop a call using the SDK "current address" empty-string convention', async () => {
      // usePerpsProState.ts / usePerpsState.ts intentionally call this with ''
      // to mean "use the currently logged-in address" (SDK: `address ||
      // this.masterAddress`). The post-await guard must resolve '' against
      // the actual current account instead of comparing '' to it.
      const getUserAbstraction = jest
        .fn()
        .mockResolvedValue(UserAbstractionResp.unifiedAccount);
      (getPerpsSDK as jest.Mock).mockReturnValue({
        info: { getUserAbstraction },
      });
      usePerpsStore.getState().setCurrentPerpsAccount(accountA);

      await usePerpsStore.getState().fetchUserAbstraction('');

      expect(usePerpsStore.getState().userAbstraction).toBe(
        UserAbstractionResp.unifiedAccount
      );
    });

    test('drops a response for the account switched away from', async () => {
      let resolveUA: (value: unknown) => void = () => {};
      const uaPromise = new Promise((resolve) => {
        resolveUA = resolve;
      });
      const getUserAbstraction = jest.fn().mockReturnValue(uaPromise);
      (getPerpsSDK as jest.Mock).mockReturnValue({
        info: { getUserAbstraction },
      });
      usePerpsStore.getState().setCurrentPerpsAccount(accountA);

      const fetchPromise = usePerpsStore
        .getState()
        .fetchUserAbstraction(accountA.address);

      // Account switches away while the request for A is still in flight.
      usePerpsStore.getState().setCurrentPerpsAccount(accountB);

      resolveUA(UserAbstractionResp.unifiedAccount);
      await fetchPromise;

      expect(usePerpsStore.getState().userAbstraction).toBe(
        UserAbstractionResp.default
      );
    });
  });

  describe('rebuildAggregatedClearinghouseState USDC-only overwrite', () => {
    const usdcBalance = {
      coin: 'USDC',
      token: 0,
      total: '100',
      hold: '0',
      available: '100',
    };

    test('preserves the raw perps withdrawable when folding spot USDC into withdrawable for a unified account', async () => {
      usePerpsStore.setState({
        currentPerpsAccount: accountA,
        userAbstraction: UserAbstractionResp.unifiedAccount,
        dexClearinghouseStates: { '': { time: 1 } as any },
        spotState: {
          ...getDefaultPerpsState().spotState,
          balancesMap: { USDC: usdcBalance },
        },
      });
      (formatAllDexsClearinghouseState as jest.Mock).mockReturnValue({
        withdrawable: '5',
        time: 1,
      });

      await usePerpsStore
        .getState()
        .rebuildAggregatedClearinghouseState({ address: accountA.address });

      expect(usePerpsStore.getState().clearinghouseState?.withdrawable).toBe(
        '105'
      );
      expect(
        usePerpsStore.getState().clearinghouseState?.perpsWithdrawable
      ).toBe('5');
    });

    test('does not overwrite withdrawable for a non-unified account', async () => {
      usePerpsStore.setState({
        currentPerpsAccount: accountA,
        userAbstraction: UserAbstractionResp.default,
        dexClearinghouseStates: { '': { time: 1 } as any },
        spotState: {
          ...getDefaultPerpsState().spotState,
          balancesMap: { USDC: usdcBalance },
        },
      });
      (formatAllDexsClearinghouseState as jest.Mock).mockReturnValue({
        withdrawable: '5',
        time: 1,
      });

      await usePerpsStore
        .getState()
        .rebuildAggregatedClearinghouseState({ address: accountA.address });

      expect(usePerpsStore.getState().clearinghouseState?.withdrawable).toBe(
        '5'
      );
      expect(
        usePerpsStore.getState().clearinghouseState?.perpsWithdrawable
      ).toBeUndefined();
    });

    test('folds in zero instead of NaN when the unified account has no USDC spot balance entry', async () => {
      usePerpsStore.setState({
        currentPerpsAccount: accountA,
        userAbstraction: UserAbstractionResp.unifiedAccount,
        dexClearinghouseStates: { '': { time: 1 } as any },
        spotState: getDefaultPerpsState().spotState, // balancesMap: {}
      });
      (formatAllDexsClearinghouseState as jest.Mock).mockReturnValue({
        withdrawable: '5',
        time: 1,
      });

      await usePerpsStore
        .getState()
        .rebuildAggregatedClearinghouseState({ address: accountA.address });

      expect(usePerpsStore.getState().clearinghouseState?.withdrawable).toBe(
        '5'
      );
      expect(
        usePerpsStore.getState().clearinghouseState?.perpsWithdrawable
      ).toBe('5');
    });

    test('does not accumulate withdrawable across repeated rebuilds', async () => {
      usePerpsStore.setState({
        currentPerpsAccount: accountA,
        userAbstraction: UserAbstractionResp.unifiedAccount,
        dexClearinghouseStates: { '': { time: 1 } as any },
        spotState: {
          ...getDefaultPerpsState().spotState,
          balancesMap: { USDC: usdcBalance },
        },
      });
      // A fresh object each call, with an increasing `time` — a repeated
      // `time: 1` would let `patchClearinghouseState`'s time guard silently
      // no-op the second call, making the "no accumulation" assertion below
      // pass trivially (it would just be re-checking the first result).
      (formatAllDexsClearinghouseState as jest.Mock)
        .mockImplementationOnce(() => ({ withdrawable: '5', time: 1 }))
        .mockImplementationOnce(() => ({ withdrawable: '5', time: 2 }));

      await usePerpsStore
        .getState()
        .rebuildAggregatedClearinghouseState({ address: accountA.address });
      expect(usePerpsStore.getState().clearinghouseState?.withdrawable).toBe(
        '105'
      );
      expect(
        usePerpsStore.getState().clearinghouseState?.perpsWithdrawable
      ).toBe('5');

      await usePerpsStore
        .getState()
        .rebuildAggregatedClearinghouseState({ address: accountA.address });
      expect(usePerpsStore.getState().clearinghouseState?.withdrawable).toBe(
        '105'
      );
      expect(
        usePerpsStore.getState().clearinghouseState?.perpsWithdrawable
      ).toBe('5');
    });

    test('drops a rebuild response for the account switched away from', async () => {
      usePerpsStore.setState({
        currentPerpsAccount: accountA,
        userAbstraction: UserAbstractionResp.unifiedAccount,
        dexClearinghouseStates: { '': { time: 1 } as any },
        spotState: {
          ...getDefaultPerpsState().spotState,
          balancesMap: { USDC: usdcBalance },
        },
      });
      (formatAllDexsClearinghouseState as jest.Mock).mockReturnValue({
        withdrawable: '5',
        time: 1,
      });

      // The account switches to B before the in-flight response for A's
      // rebuild is applied. setCurrentPerpsAccount also clears
      // dexClearinghouseStates as a side effect, which would make
      // `if (!dexMap[''])` bail out on its own — re-seed it so the address
      // guard (not the empty-map bail) is what this test is exercising.
      usePerpsStore.getState().setCurrentPerpsAccount(accountB);
      usePerpsStore.setState({
        dexClearinghouseStates: { '': { time: 1 } as any },
      });
      await usePerpsStore
        .getState()
        .rebuildAggregatedClearinghouseState({ address: accountA.address });

      expect(usePerpsStore.getState().clearinghouseState).toBeNull();
    });
  });

  describe('per-dex clearinghouse-state fetch account-switch guard', () => {
    test('fetchAllDexsClearinghouseState drops a response for the account switched away from', async () => {
      let resolveAllDexs: (value: unknown) => void = () => {};
      const allDexsPromise = new Promise((resolve) => {
        resolveAllDexs = resolve;
      });
      (fetchAllDexsRaw as jest.Mock).mockReturnValue(allDexsPromise);
      usePerpsStore.getState().setCurrentPerpsAccount(accountA);

      const fetchPromise = usePerpsStore
        .getState()
        .fetchAllDexsClearinghouseState();

      // Account switches away while the request for A is still in flight.
      // setCurrentPerpsAccount also clears dexClearinghouseStates as a
      // side effect.
      usePerpsStore.getState().setCurrentPerpsAccount(accountB);

      resolveAllDexs([['', { time: 1 }]]);
      await fetchPromise;

      expect(usePerpsStore.getState().dexClearinghouseStates).toEqual({});
    });

    test('fetchSingleDexClearinghouseState drops a response for the account switched away from', async () => {
      let resolveSingle: (value: unknown) => void = () => {};
      const singlePromise = new Promise((resolve) => {
        resolveSingle = resolve;
      });
      const getClearingHouseState = jest.fn().mockReturnValue(singlePromise);
      (getPerpsSDK as jest.Mock).mockReturnValue({
        info: { getClearingHouseState },
      });
      usePerpsStore.getState().setCurrentPerpsAccount(accountA);

      const fetchPromise = usePerpsStore
        .getState()
        .fetchSingleDexClearinghouseState({ dex: '' });

      // Account switches away while the request for A is still in flight.
      // setCurrentPerpsAccount also clears dexClearinghouseStates as a
      // side effect.
      usePerpsStore.getState().setCurrentPerpsAccount(accountB);

      resolveSingle({ time: 1 });
      await fetchPromise;

      expect(usePerpsStore.getState().dexClearinghouseStates).toEqual({});
    });
  });

  describe('setCurrentPerpsAccount dexClearinghouseStates reset', () => {
    test('clears dexClearinghouseStates when switching to a different address', () => {
      usePerpsStore.setState({
        currentPerpsAccount: accountA,
        dexClearinghouseStates: { '': { time: 1 } as any },
      });

      usePerpsStore.getState().setCurrentPerpsAccount(accountB);

      expect(usePerpsStore.getState().dexClearinghouseStates).toEqual({});
    });

    test('keeps dexClearinghouseStates when the address is unchanged (case-insensitive)', () => {
      const seeded = { '': { time: 1 } as any };
      usePerpsStore.setState({
        currentPerpsAccount: accountA,
        dexClearinghouseStates: seeded,
      });

      usePerpsStore.getState().setCurrentPerpsAccount({
        ...accountA,
        address: accountA.address.toUpperCase(),
      });

      expect(usePerpsStore.getState().dexClearinghouseStates).toBe(seeded);
    });
  });
});
