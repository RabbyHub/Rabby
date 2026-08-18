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

  test('optimistically adds an RPC and persists only the custom RPC field', async () => {
    (wallet.setStorageItem as jest.Mock).mockClear();

    await useCustomRPCStore.getState().setCustomRPC({
      chain: CHAINS_ENUM.BSC,
      url: 'https://bsc.example',
    });

    expect(useCustomRPCStore.getState().customRPC.BSC).toEqual({
      url: 'https://bsc.example',
      enable: true,
    });
    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'rpc',
      {
        customRPC: {
          ETH: {
            url: 'https://eth.example',
            enable: true,
          },
          BSC: {
            url: 'https://bsc.example',
            enable: true,
          },
        },
      },
      []
    );
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
