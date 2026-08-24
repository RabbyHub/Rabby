import type { PublicOpenapiStore } from '@/background/service/openapi';
import { useOpenapiStore } from '@/ui/state/openapi';
import { wallet } from '@/ui/wallet';

jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
    },
  },
  tabs: {
    onCreated: {
      addListener: jest.fn(),
    },
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getStorageSnapshot: jest.fn().mockResolvedValue({
      origin: 'background-1',
      revision: 1,
      state: {
        host: 'https://api.example.com',
        testnetHost: 'https://testnet-api.example.com',
      },
    }),
    setStorageItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const openapiState: PublicOpenapiStore = {
  host: 'https://api.example.com',
  testnetHost: 'https://testnet-api.example.com',
};

describe('openapi store', () => {
  beforeAll(async () => {
    (wallet.getStorageSnapshot as jest.Mock).mockResolvedValue({
      origin: 'background-1',
      revision: 1,
      state: openapiState,
    });
    await useOpenapiStore.persist.hydrationPromise();
  });

  afterAll(() => {
    useOpenapiStore.persist.destroy();
  });

  test('hydrates only the hosts from the background store', () => {
    expect(useOpenapiStore.getState()).toMatchObject(openapiState);
    // `apiKey` is the X-API-Key header for every api.rabby.io request; it must
    // never be reachable from an extension page.
    expect(useOpenapiStore.getState()).not.toHaveProperty('apiKey');
    expect(useOpenapiStore.getState()).not.toHaveProperty('apiTime');
  });

  test('optimistically persists only the mainnet host', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    useOpenapiStore.getState().setHost('https://next-api.example.com');

    expect(useOpenapiStore.getState().host).toBe(
      'https://next-api.example.com'
    );
    await useOpenapiStore.persist.flush();
    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'openapi',
      { host: 'https://next-api.example.com' },
      []
    );
  });

  test('optimistically persists only the testnet host', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    useOpenapiStore
      .getState()
      .setTestnetHost('https://next-testnet-api.example.com');

    expect(useOpenapiStore.getState().testnetHost).toBe(
      'https://next-testnet-api.example.com'
    );
    await useOpenapiStore.persist.flush();
    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'openapi',
      { testnetHost: 'https://next-testnet-api.example.com' },
      []
    );
  });
});
