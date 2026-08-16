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
    getStorageSnapshot.mockResolvedValue({
      origin: 'background-1',
      revision: 2,
      state: swapState,
    });
    setStorageItem.mockResolvedValue(undefined);
    const options = createExtensionStoreOptions<TestSwapStore, 'swap'>({
      storageKey: 'swap',
    });

    await expect(options.storage.get()).resolves.toEqual({
      origin: 'background-1',
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
    expect(setStorageItem).toHaveBeenCalledWith('swap', { slippage: '0.5' }, []);

    const listener = jest.fn();
    const dispose = options.sync!.engine.subscribe(listener);
    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'swap',
      changedKey: 'slippage',
      changedKeys: ['slippage'],
      partials: { slippage: '1' },
      origin: 'background-1',
      revision: 3,
    });
    expect(listener).toHaveBeenCalledWith({
      origin: 'background-1',
      revision: 3,
      state: { slippage: '1' },
    });
    dispose();
  });

  // Chrome serializes port messages as JSON, which drops keys whose value is
  // `undefined`. The round trips below reproduce that, so a regression here
  // can't pass just because the mock keeps the key in-process.
  const overWire = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  test('carries cleared fields across the JSON port boundary', async () => {
    const setStorageItem = wallet.setStorageItem as jest.Mock;
    setStorageItem.mockReset();
    setStorageItem.mockResolvedValue(undefined);
    const options = createExtensionStoreOptions<TestSwapStore, 'swap'>({
      storageKey: 'swap',
    });

    await options.storage.set({
      changedKeys: ['selectedChain', 'selectedFromToken', 'selectedToToken'],
      partials: {
        selectedChain: 'BSC' as any,
        selectedFromToken: undefined,
        selectedToToken: undefined,
      },
      previousState: swapState,
      state: { ...swapState, selectedChain: 'BSC' as any },
    });

    const [, partials, clearedKeys] = setStorageItem.mock.calls[0];
    // What the background actually receives.
    expect(overWire(partials)).toEqual({ selectedChain: 'BSC' });
    expect(overWire(clearedKeys)).toEqual([
      'selectedFromToken',
      'selectedToToken',
    ]);
  });

  test('restores cleared fields from a broadcast that lost them in transit', () => {
    const options = createExtensionStoreOptions<TestSwapStore, 'swap'>({
      storageKey: 'swap',
    });
    const listener = jest.fn();
    const dispose = options.sync!.engine.subscribe(listener);

    eventBus.emit(
      BROADCAST_TO_UI_EVENTS.storeChanged,
      overWire({
        bgStoreName: 'swap',
        changedKey: 'selectedChain',
        changedKeys: ['selectedChain', 'selectedFromToken'],
        partials: { selectedChain: 'BSC', selectedFromToken: undefined },
        origin: 'background-1',
        revision: 4,
      })
    );

    const { state } = listener.mock.calls[0][0];
    expect(state.selectedChain).toBe('BSC');
    expect(Object.prototype.hasOwnProperty.call(state, 'selectedFromToken')).toBe(
      true
    );
    expect(state.selectedFromToken).toBeUndefined();
    dispose();
  });
});
