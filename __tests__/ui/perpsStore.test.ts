import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { getDefaultPerpsState, usePerpsStore } from '@/ui/state/perps';
import { wallet } from '@/ui/wallet';

jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('@/ui/utils', () => ({
  isSameAddress: (left: string, right: string) =>
    left.toLowerCase() === right.toLowerCase(),
}));

jest.mock('@/ui/views/Perps/sdkManager', () => ({
  getPerpsSDK: jest.fn(),
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
});
