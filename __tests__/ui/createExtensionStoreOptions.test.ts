import eventBus from '@/eventBus';
import type { SwapServiceStore } from '@/background/service/swap';
import { createExtensionStoreOptions } from '@/ui/state/createStore/createExtensionStoreOptions';
import { wallet } from '@/ui/wallet';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getStorageItem: jest.fn(),
    getStorageSnapshot: jest.fn(),
    setStorageItem: jest.fn(),
  },
}));

type TestSwapStore = SwapServiceStore & Record<string, unknown>;

const swapState: SwapServiceStore = {
  autoSlippage: true,
  preferMEVGuarded: false,
  recentToTokens: [],
  selectedChain: null,
  slippage: '0.1',
};

describe('createExtensionStoreOptions', () => {
  test('adapts wallet storage methods and background store broadcasts', async () => {
    const getStorageSnapshot = wallet.getStorageSnapshot as jest.Mock;
    const setStorageItem = wallet.setStorageItem as jest.Mock;
    getStorageSnapshot.mockResolvedValue({ revision: 2, state: swapState });
    setStorageItem.mockResolvedValue(undefined);
    const options = createExtensionStoreOptions<TestSwapStore, 'swap'>({
      storageKey: 'swap',
    });

    await expect(options.storage.get()).resolves.toEqual({
      revision: 2,
      state: swapState,
    });
    await options.storage.set({
      changedKeys: ['slippage'],
      partials: { slippage: '0.5' },
      previousState: { ...swapState, slippage: '0.1' },
      state: { ...swapState, slippage: '0.5' },
    });
    expect(getStorageSnapshot).toHaveBeenCalledWith('swap');
    expect(setStorageItem).toHaveBeenCalledWith('swap', { slippage: '0.5' });

    const listener = jest.fn();
    const dispose = options.sync!.engine.subscribe(listener);
    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'swap',
      changedKey: 'slippage',
      changedKeys: ['slippage'],
      partials: { slippage: '1' },
      revision: 3,
    });
    expect(listener).toHaveBeenCalledWith({
      revision: 3,
      state: { slippage: '1' },
    });
    dispose();
  });
});
