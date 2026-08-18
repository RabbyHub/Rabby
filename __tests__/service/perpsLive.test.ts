const mockSessionGet = jest.fn();
const mockSessionSet = jest.fn();
const mockOpenapiGetTopTokens = jest.fn();
const mockGetPerpsAllMetas = jest.fn();
const mockGetPerpDexs = jest.fn();
const mockSubscribeAllDexs = jest.fn();
const mockSdkConstructor = jest.fn();
const mockEventBusAddListener = jest.fn();

let mockWidgetEnabled = true;
const mockPerpsStore: {
  currentAccount: { address: string } | null;
} = {
  currentAccount: {
    address: '0x0000000000000000000000000000000000000001',
  },
};

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    storage: {
      session: {
        get: mockSessionGet,
        set: mockSessionSet,
      },
    },
  },
}));

jest.mock('@rabby-wallet/hyperliquid-sdk', () => ({
  HyperliquidSDK: jest
    .fn()
    .mockImplementation((config) => mockSdkConstructor(config)),
}));

jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: {
    addEventListener: mockEventBusAddListener,
  },
}));

jest.mock('@/constant', () => ({
  EVENTS: {
    PERPS: {
      WIDGET_ACCOUNT_CHANGED: 'WIDGET_ACCOUNT_CHANGED',
      WIDGET_ENABLED_CHANGED: 'WIDGET_ENABLED_CHANGED',
    },
  },
}));

jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: {
    getPerpTopTokenListV3: mockOpenapiGetTopTokens,
  },
}));

jest.mock('@/background/service/perps', () => ({
  __esModule: true,
  default: {
    store: mockPerpsStore,
  },
}));

jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: {
    getPerpsWidgetEnabled: () => mockWidgetEnabled,
  },
}));

import { PerpsLiveService } from '@/background/service/perpsLive';

const CATALOG_CACHE_KEY = 'perpsLiveCatalogV1';
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const CATALOG_RETRY_BASE_MS = 5 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 18, 0, 0, 0);

const token = {
  id: 'btc',
  token_id: 1,
  name: 'BTC',
  daily_volume: 1,
  display_name: 'BTC/USDC',
};

function createPort() {
  const disconnectListeners: Array<() => void> = [];
  return {
    postMessage: jest.fn(),
    onDisconnect: {
      addListener: jest.fn((listener: () => void) => {
        disconnectListeners.push(listener);
      }),
    },
    disconnect: () => disconnectListeners.forEach((listener) => listener()),
  } as any;
}

function createFreshCache(fetchedAt = NOW) {
  return {
    version: 1,
    fetchedAt,
    tokenCatalog: [token],
    dexLookup: [{ dexId: '', quoteAsset: 'USDC' }],
  };
}

async function waitForCatalog(service: PerpsLiveService) {
  const promise = (service as any).catalogLoadPromise as Promise<void> | null;
  if (promise) await promise;
}

describe('PerpsLiveService lazy catalogs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.clearAllMocks();
    mockWidgetEnabled = true;
    mockPerpsStore.currentAccount = {
      address: '0x0000000000000000000000000000000000000001',
    };
    mockSessionGet.mockResolvedValue({});
    mockSessionSet.mockResolvedValue(undefined);
    mockOpenapiGetTopTokens.mockResolvedValue([token]);
    mockGetPerpsAllMetas.mockResolvedValue([{ collateralToken: 0 }]);
    mockGetPerpDexs.mockResolvedValue([null]);
    mockSubscribeAllDexs.mockReturnValue({ unsubscribe: jest.fn() });
    mockSdkConstructor.mockImplementation(() => ({
      ws: {
        isConnected: true,
        subscribeToAllDexsClearinghouseState: mockSubscribeAllDexs,
        subscribeToActiveAssetCtx: jest.fn(),
      },
      info: {
        getPerpsAllMetas: mockGetPerpsAllMetas,
        getPerpDexs: mockGetPerpDexs,
        candleSnapshot: jest.fn(),
      },
      disconnectWebSocket: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('boot registers lifecycle listeners without constructing an SDK or reading the cache', () => {
    const service = new PerpsLiveService();

    service.boot();

    expect(mockEventBusAddListener).toHaveBeenCalledTimes(2);
    expect(mockSdkConstructor).not.toHaveBeenCalled();
    expect(mockSessionGet).not.toHaveBeenCalled();
    expect(mockOpenapiGetTopTokens).not.toHaveBeenCalled();
  });

  test('does not load catalogs when a port attaches while the widget is disabled', () => {
    mockWidgetEnabled = false;
    const service = new PerpsLiveService();

    service.attachPort(createPort());

    expect(mockSdkConstructor).not.toHaveBeenCalled();
    expect(mockSessionGet).not.toHaveBeenCalled();
    expect(mockOpenapiGetTopTokens).not.toHaveBeenCalled();
  });

  test('does not load catalogs without a current perps account', () => {
    mockPerpsStore.currentAccount = null;
    const service = new PerpsLiveService();

    service.attachPort(createPort());

    expect(mockSdkConstructor).not.toHaveBeenCalled();
    expect(mockSessionGet).not.toHaveBeenCalled();
    expect(mockOpenapiGetTopTokens).not.toHaveBeenCalled();
  });

  test('loads and persists catalogs once for the first active stream', async () => {
    const service = new PerpsLiveService();

    service.attachPort(createPort());
    const concurrentLoad = (service as any).ensureCatalogs();
    await Promise.all([waitForCatalog(service), concurrentLoad]);

    expect(mockSdkConstructor).toHaveBeenCalledTimes(1);
    expect(mockSessionGet).toHaveBeenCalledTimes(1);
    expect(mockOpenapiGetTopTokens).toHaveBeenCalledTimes(1);
    expect(mockGetPerpsAllMetas).toHaveBeenCalledTimes(1);
    expect(mockGetPerpDexs).toHaveBeenCalledTimes(1);
    expect(mockSessionSet).toHaveBeenCalledWith({
      [CATALOG_CACHE_KEY]: createFreshCache(),
    });
  });

  test('hydrates a fresh session cache without any catalog REST requests', async () => {
    mockSessionGet.mockResolvedValue({
      [CATALOG_CACHE_KEY]: createFreshCache(),
    });
    const service = new PerpsLiveService();

    service.attachPort(createPort());
    await waitForCatalog(service);

    expect(mockSessionGet).toHaveBeenCalledTimes(1);
    expect(mockOpenapiGetTopTokens).not.toHaveBeenCalled();
    expect(mockGetPerpsAllMetas).not.toHaveBeenCalled();
    expect(mockGetPerpDexs).not.toHaveBeenCalled();
    expect(mockSessionSet).not.toHaveBeenCalled();
    expect((service as any).tokenCatalog.get('BTC')).toEqual(token);
    expect((service as any).dexLookup.get('')).toEqual({ quoteAsset: 'USDC' });
  });

  test('refreshes an expired cache and uses a fresh SDK after the TTL', async () => {
    const service = new PerpsLiveService();
    service.attachPort(createPort());
    await waitForCatalog(service);

    jest.setSystemTime(NOW + CATALOG_TTL_MS);
    mockSessionGet.mockResolvedValue({
      [CATALOG_CACHE_KEY]: createFreshCache(NOW),
    });
    await (service as any).ensureCatalogs();

    expect(mockSdkConstructor).toHaveBeenCalledTimes(2);
    expect(mockOpenapiGetTopTokens).toHaveBeenCalledTimes(2);
    expect(mockGetPerpsAllMetas).toHaveBeenCalledTimes(2);
    expect(mockGetPerpDexs).toHaveBeenCalledTimes(2);
    expect(mockSessionSet).toHaveBeenLastCalledWith({
      [CATALOG_CACHE_KEY]: createFreshCache(NOW + CATALOG_TTL_MS),
    });
  });

  test('backs off exponentially after failed loads and resets after recovery', async () => {
    mockOpenapiGetTopTokens.mockRejectedValueOnce(new Error('offline'));
    const service = new PerpsLiveService();
    service.attachPort(createPort());
    await waitForCatalog(service);

    await (service as any).ensureCatalogs();
    expect(mockOpenapiGetTopTokens).toHaveBeenCalledTimes(1);
    expect(mockSessionSet).not.toHaveBeenCalled();

    jest.setSystemTime(NOW + CATALOG_RETRY_BASE_MS - 1);
    await (service as any).ensureCatalogs();
    expect(mockOpenapiGetTopTokens).toHaveBeenCalledTimes(1);

    mockOpenapiGetTopTokens.mockRejectedValueOnce(new Error('still offline'));
    jest.setSystemTime(NOW + CATALOG_RETRY_BASE_MS);
    await (service as any).ensureCatalogs();
    expect(mockOpenapiGetTopTokens).toHaveBeenCalledTimes(2);
    expect((service as any).catalogRetryAt).toBe(
      NOW + CATALOG_RETRY_BASE_MS * 3
    );

    jest.setSystemTime(NOW + CATALOG_RETRY_BASE_MS * 3 - 1);
    await (service as any).ensureCatalogs();
    expect(mockOpenapiGetTopTokens).toHaveBeenCalledTimes(2);

    mockOpenapiGetTopTokens.mockResolvedValue([token]);
    jest.setSystemTime(NOW + CATALOG_RETRY_BASE_MS * 3);
    await (service as any).ensureCatalogs();

    expect(mockOpenapiGetTopTokens).toHaveBeenCalledTimes(3);
    expect(mockSessionSet).toHaveBeenCalledTimes(1);
    expect((service as any).catalogRetryAt).toBe(0);
    expect((service as any).catalogRetryDelayMs).toBe(CATALOG_RETRY_BASE_MS);
  });
});
