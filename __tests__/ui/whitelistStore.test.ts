import eventBus from '@/eventBus';
import { useWhitelistStore } from '@/ui/state/whitelist';
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
      revision: 1,
      state: {
        enabled: true,
        whitelists: ['0xaaa', '0xbbb'],
      },
    }),
    setStorageItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('whitelist store', () => {
  beforeAll(async () => {
    await useWhitelistStore.persist.hydrationPromise();
  });

  afterAll(() => {
    useWhitelistStore.persist.destroy();
  });

  test('hydrates whitelist state from the background store', () => {
    expect(useWhitelistStore.getState()).toMatchObject({
      enabled: true,
      whitelists: ['0xaaa', '0xbbb'],
    });
  });

  test('optimistically persists a valid reorder', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    useWhitelistStore.getState().updateWhitelistOrder(['0xBBB', '0xAAA']);

    expect(useWhitelistStore.getState().whitelists).toEqual(['0xbbb', '0xaaa']);
    await useWhitelistStore.persist.flush();
    expect(wallet.setStorageItem).toHaveBeenCalledWith('whitelist', {
      whitelists: ['0xbbb', '0xaaa'],
    });
  });

  test('rejects a membership change disguised as a reorder', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    useWhitelistStore.getState().updateWhitelistOrder(['0xbbb', '0xccc']);

    expect(useWhitelistStore.getState().whitelists).toEqual(['0xbbb', '0xaaa']);
    await useWhitelistStore.persist.flush();
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  test('applies background membership changes without writing them back', () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'whitelist',
      changedKey: 'whitelists',
      changedKeys: ['whitelists'],
      partials: {
        whitelists: ['0xbbb', '0xaaa', '0xccc'],
      },
      revision: 2,
    });

    expect(useWhitelistStore.getState().whitelists).toEqual([
      '0xbbb',
      '0xaaa',
      '0xccc',
    ]);
    expect(useWhitelistStore.getState().isInWhitelist('0xCCC')).toBe(true);
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });
});
