import type { PublicOpenapiStore } from '@/services/openapi';
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
        apiKey: 'background-key',
        apiTime: 100,
      },
    }),
    setStorageItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const openapiState: PublicOpenapiStore = {
  host: 'https://api.example.com',
  apiKey: 'background-key',
  apiTime: 100,
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

  test('hydrates the shared OpenAPI identity from the background store', () => {
    expect(useOpenapiStore.getState()).toMatchObject(openapiState);
    expect(useOpenapiStore.getState()).not.toHaveProperty('testnetHost');
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
});
