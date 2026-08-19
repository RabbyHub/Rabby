import eventBus from '@/eventBus';
import { useCustomRPCStore } from '@/ui/state/customRPC';
import { wallet } from '@/ui/wallet';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';
import { CHAINS_ENUM } from '@debank/common';

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
        customRPC: {
          ETH: {
            url: 'https://eth.example',
            enable: true,
          },
        },
      },
    }),
    setStorageItem: jest.fn().mockResolvedValue(undefined),
    setCustomRPC: jest.fn().mockResolvedValue(undefined),
    setRPCEnable: jest.fn().mockResolvedValue(undefined),
    removeCustomRPC: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('custom RPC store', () => {
  beforeAll(async () => {
    await useCustomRPCStore.persist.hydrationPromise();
  });

  afterAll(() => {
    useCustomRPCStore.persist.destroy();
  });

  test('hydrates the custom RPC slice from the background service', async () => {
    await expect(useCustomRPCStore.getState().getAllRPC()).resolves.toEqual({
      ETH: {
        url: 'https://eth.example',
        enable: true,
      },
    });
  });

  test('adds an RPC through the per-chain controller, not a map write', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    await useCustomRPCStore.getState().setCustomRPC({
      chain: CHAINS_ENUM.BSC,
      url: 'https://bsc.example',
    });

    expect(wallet.setCustomRPC).toHaveBeenCalledWith(
      CHAINS_ENUM.BSC,
      'https://bsc.example'
    );
    // Persisting the whole map here would be last-writer-wins against any
    // other UI context; the background merges one chain and broadcasts back.
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  test('toggles and removes through the per-chain controller', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    await useCustomRPCStore
      .getState()
      .setRPCEnable({ chain: CHAINS_ENUM.ETH, enable: false });
    await useCustomRPCStore.getState().deleteCustomRPC(CHAINS_ENUM.ETH);

    expect(wallet.setRPCEnable).toHaveBeenCalledWith(CHAINS_ENUM.ETH, false);
    expect(wallet.removeCustomRPC).toHaveBeenCalledWith(CHAINS_ENUM.ETH);
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  test('skips toggling a chain the snapshot does not know', async () => {
    (wallet.setRPCEnable as jest.Mock).mockClear();

    await useCustomRPCStore
      .getState()
      .setRPCEnable({ chain: CHAINS_ENUM.BSC, enable: true });

    expect(wallet.setRPCEnable).not.toHaveBeenCalled();
  });

  test('applies background RPC changes without writing them back', () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'rpc',
      changedKey: 'customRPC',
      changedKeys: ['customRPC'],
      partials: {
        customRPC: {
          ETH: {
            url: 'https://new-eth.example',
            enable: false,
          },
        },
      },
      origin: 'background-1',
      revision: 2,
    });

    expect(useCustomRPCStore.getState().customRPC).toEqual({
      ETH: {
        url: 'https://new-eth.example',
        enable: false,
      },
    });
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });
});
