import type { CurrencyStore } from '@/background/service/currency';
import type { CurrencyItem } from '@/background/service/openapi';
import eventBus from '@/eventBus';
import { useCurrencyStore } from '@/ui/state/currency';
import { wallet } from '@/ui/wallet';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';

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
        currency: 'USD',
        currencyList: [
          {
            code: 'USD',
            symbol: '$',
            logo_url: 'usd.png',
            usd_rate: 1,
            is_prefix: true,
          },
        ],
        updatedAt: 1,
      },
    }),
    setStorageItem: jest.fn(),
    syncCurrencyList: jest.fn(),
  },
}));

const usdCurrency: CurrencyItem = {
  code: 'USD',
  symbol: '$',
  logo_url: 'usd.png',
  usd_rate: 1,
  is_prefix: true,
};

const eurCurrency: CurrencyItem = {
  code: 'EUR',
  symbol: '€',
  logo_url: 'eur.png',
  usd_rate: 0.86,
  is_prefix: true,
};

const currencyState: CurrencyStore = {
  currency: 'USD',
  currencyList: [usdCurrency],
  updatedAt: 1,
};

describe('currency store', () => {
  beforeAll(async () => {
    (wallet.getStorageSnapshot as jest.Mock).mockResolvedValue({
      origin: 'background-1',
      revision: 1,
      state: currencyState,
    });
    (wallet.setStorageItem as jest.Mock).mockResolvedValue(undefined);
    await useCurrencyStore.persist.hydrate();
  });

  afterAll(() => {
    useCurrencyStore.persist.destroy();
  });

  test('hydrates currency state from the background store', () => {
    expect(useCurrencyStore.getState()).toMatchObject(currencyState);
  });

  test('optimistically persists only the selected currency', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    useCurrencyStore.getState().setCurrency('EUR');

    expect(useCurrencyStore.getState().currency).toBe('EUR');
    await useCurrencyStore.persist.flush();
    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'currency',
      { currency: 'EUR' },
      []
    );
  });

  test('applies synced currency lists without writing them back', async () => {
    (wallet.syncCurrencyList as jest.Mock).mockResolvedValue([eurCurrency]);
    (wallet.setStorageItem as jest.Mock).mockClear();

    await expect(
      useCurrencyStore.getState().syncCurrencyList(true)
    ).resolves.toEqual([eurCurrency]);
    expect(wallet.syncCurrencyList).toHaveBeenCalledWith(true);

    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'currency',
      changedKey: 'currencyList',
      changedKeys: ['currencyList', 'updatedAt'],
      partials: {
        currencyList: [eurCurrency],
        updatedAt: 2,
      },
      origin: 'background-1',
      revision: 2,
    });

    expect(useCurrencyStore.getState()).toMatchObject({
      currency: 'EUR',
      currencyList: [eurCurrency],
      updatedAt: 2,
    });
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });
});
