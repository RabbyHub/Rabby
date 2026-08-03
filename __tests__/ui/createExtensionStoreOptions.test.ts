import eventBus from '@/eventBus';
import type { SwapServiceStore } from '@/background/service/swap';
import { createExtensionStoreOptions } from '@/ui/stores/createExtensionStoreOptions';
import { wallet } from '@/ui/wallet';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getStorageItem: jest.fn(),
    setStorageItem: jest.fn(),
  },
}));

type TestSwapStore = SwapServiceStore & Record<string, unknown>;

const swapState: SwapServiceStore = {
  autoSlippage: true,
  gasPriceCache: {},
  preferMEVGuarded: false,
  selectedChain: null,
  selectedDex: null,
  slippage: '0.1',
  tradeList: {} as SwapServiceStore['tradeList'],
  unlimitedAllowance: false,
  viewList: {} as SwapServiceStore['viewList'],
};

describe('createExtensionStoreOptions', () => {
  test('adapts wallet storage methods and background store broadcasts', async () => {
    const getStorageItem = wallet.getStorageItem as jest.Mock;
    const setStorageItem = wallet.setStorageItem as jest.Mock;
    getStorageItem.mockResolvedValue(swapState);
    setStorageItem.mockResolvedValue(undefined);
    const options = createExtensionStoreOptions<TestSwapStore, 'swap'>({
      storageKey: 'swap',
    });

    await expect(options.storage.get()).resolves.toBe(swapState);
    await options.storage.set({
      changedKeys: ['slippage'],
      previousState: { ...swapState, slippage: '0.1' },
      state: { ...swapState, slippage: '0.5' },
    });
    expect(getStorageItem).toHaveBeenCalledWith('swap');
    expect(setStorageItem).toHaveBeenCalledWith('swap', {
      ...swapState,
      slippage: '0.5',
    });

    const listener = jest.fn();
    const dispose = options.sync!.engine.subscribe(listener);
    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'swap',
      changedKey: 'slippage',
      changedKeys: ['slippage'],
      partials: { slippage: '1' },
    });
    expect(listener).toHaveBeenCalledWith({ slippage: '1' });
    dispose();
  });
});
