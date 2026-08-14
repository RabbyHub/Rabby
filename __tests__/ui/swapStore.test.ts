import { SwapServiceStore } from '@/background/service/swap';
import { DEX } from '@/constant';
import { useSwapStore } from '@/ui/state/swap';
import { wallet } from '@/ui/wallet';
import { findChain } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

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
    getStorageSnapshot: jest.fn(),
    openapi: {
      getSupportedDEXList: jest.fn(),
    },
    setStorageItem: jest.fn(),
  },
}));

const ethServerId = findChain({ enum: CHAINS_ENUM.ETH })!.serverId;
const ethFromToken = {
  chain: ethServerId,
  id: '0xfrom',
} as TokenItem;
const ethToToken = {
  chain: ethServerId,
  id: '0xto',
} as TokenItem;

const swapState: SwapServiceStore = {
  autoSlippage: true,
  preferMEVGuarded: false,
  recentToTokens: [],
  selectedChain: CHAINS_ENUM.ETH,
  selectedFromToken: ethFromToken,
  selectedToToken: ethToToken,
  slippage: '0.1',
};

describe('swap store', () => {
  beforeAll(async () => {
    (wallet.getStorageSnapshot as jest.Mock).mockResolvedValue({
      origin: 'background-1',
      revision: 0,
      state: swapState,
    });
    (wallet.setStorageItem as jest.Mock).mockResolvedValue(undefined);
    await useSwapStore.persist.hydrate();
  });

  afterAll(() => {
    useSwapStore.persist.destroy();
  });

  test('clears incompatible tokens in the same persisted chain update', async () => {
    useSwapStore.getState().setSelectedChain(CHAINS_ENUM.ETH);
    expect(useSwapStore.getState()).toMatchObject({
      selectedChain: CHAINS_ENUM.ETH,
      selectedFromToken: ethFromToken,
      selectedToToken: ethToToken,
    });
    expect(wallet.setStorageItem).not.toHaveBeenCalled();

    useSwapStore.getState().setSelectedChain(CHAINS_ENUM.BSC);

    expect(useSwapStore.getState()).toMatchObject({
      selectedChain: CHAINS_ENUM.BSC,
      selectedFromToken: undefined,
      selectedToToken: undefined,
    });

    await useSwapStore.persist.flush();
    expect(wallet.setStorageItem).toHaveBeenCalledTimes(1);
    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'swap',
      {
        selectedChain: CHAINS_ENUM.BSC,
        selectedFromToken: undefined,
        selectedToToken: undefined,
      },
      ['selectedFromToken', 'selectedToToken']
    );

    // The assertion above passes even when the clears are lost, because the
    // mocked wallet keeps the keys in-process. Chrome's port messaging is
    // JSON-serialized, so replay that here: the cleared fields must survive as
    // the third argument, not as `undefined` values in the patch.
    const [, partials, clearedKeys] = (wallet.setStorageItem as jest.Mock).mock
      .calls[0];
    const overWire = <T>(value: T): T => JSON.parse(JSON.stringify(value));
    expect(overWire(partials)).toEqual({ selectedChain: CHAINS_ENUM.BSC });
    expect(overWire(clearedKeys)).toEqual([
      'selectedFromToken',
      'selectedToToken',
    ]);
  });

  test('updates UI-only state without persisting it', async () => {
    const supportedDex = Object.keys(DEX)[0];
    (wallet.openapi.getSupportedDEXList as jest.Mock).mockResolvedValue({
      dex_list: [supportedDex, 'unknown'],
    });
    (wallet.setStorageItem as jest.Mock).mockClear();

    await useSwapStore.getState().getSwapSupportedDEXList();
    await useSwapStore.persist.flush();

    expect(useSwapStore.getState().supportedDEXList).toEqual([supportedDex]);
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });
});
