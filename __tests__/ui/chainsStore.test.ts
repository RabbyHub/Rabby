import type { TestnetChain } from '@/background/service/customTestnet';
import { useAccountStore } from '@/ui/state/account';
import {
  getDefaultChainsState,
  useChainsStore,
} from '@/ui/state/chains';
import { useSwapStore } from '@/ui/state/swap';
import { wallet } from '@/ui/wallet';
import {
  getMainnetListFromLocal,
  updateChainStore,
  varyAndSortChainItems,
} from '@/utils/chain';
import type { Chain } from '@debank/common';
import { CHAINS_ENUM } from '@debank/common';

jest.mock('@/utils/chain', () => ({
  getChainList: jest.fn((network: 'mainnet' | 'testnet') =>
    network === 'mainnet'
      ? [{ enum: 'ETH', serverId: 'eth', name: 'Ethereum' }]
      : []
  ),
  getMainnetListFromLocal: jest.fn(),
  updateChainStore: jest.fn(),
  varyAndSortChainItems: jest.fn(),
}));

jest.mock('@/ui/state/account', () => ({
  useAccountStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/ui/state/swap', () => ({
  useSwapStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getCustomTestnetList: jest.fn(),
    getCustomTestnetLogos: jest.fn(),
    getPreference: jest.fn(),
  },
}));

const mainnetChain = {
  enum: CHAINS_ENUM.ETH,
  serverId: 'eth',
  name: 'Ethereum',
} as Chain;
const cachedMainnetChain = {
  enum: CHAINS_ENUM.BSC,
  serverId: 'bsc',
  name: 'BNB Chain',
} as Chain;
const testnetChain = {
  enum: 'CUSTOM_1',
  serverId: 'custom-1',
  name: 'Custom Testnet',
  isTestnet: true,
} as unknown as TestnetChain;

describe('chains store', () => {
  const checkSwapStore = jest.fn();
  const getMatteredChainBalance = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useChainsStore.setState(getDefaultChainsState());
    (useSwapStore.getState as jest.Mock).mockReturnValue({
      checkStore: checkSwapStore,
    });
    (useAccountStore.getState as jest.Mock).mockReturnValue({
      getMatteredChainBalance,
    });
  });

  test('keeps runtime chain lists in a non-persisted store', () => {
    expect(useChainsStore.getState()).toMatchObject({
      currentConnection: null,
      gnosisPendingCount: 0,
      mainnetList: [expect.objectContaining({ enum: CHAINS_ENUM.ETH })],
      testnetList: [],
    });
    expect('persist' in useChainsStore).toBe(false);
  });

  test('loads cached mainnets and background custom testnets', async () => {
    (wallet.getCustomTestnetLogos as jest.Mock).mockResolvedValue(undefined);
    (wallet.getCustomTestnetList as jest.Mock).mockResolvedValue([
      testnetChain,
    ]);
    (getMainnetListFromLocal as jest.Mock).mockResolvedValue([
      cachedMainnetChain,
    ]);

    await useChainsStore.getState().init();

    expect(updateChainStore).toHaveBeenCalledWith({
      testnetList: [testnetChain],
    });
    expect(updateChainStore).toHaveBeenCalledWith({
      mainnetList: [cachedMainnetChain],
    });
    expect(useChainsStore.getState()).toMatchObject({
      mainnetList: [cachedMainnetChain],
      testnetList: [testnetChain],
    });
    expect(checkSwapStore).toHaveBeenCalledTimes(1);
  });

  test('updates transient fields through the compatibility action', () => {
    useChainsStore.getState().setField({ gnosisPendingCount: 2 });

    expect(useChainsStore.getState().gnosisPendingCount).toBe(2);
  });

  test('orders chains using pinned preferences and account balances', async () => {
    const matteredChainBalances = {
      eth: { id: 'eth', usd_value: 10 },
    };
    (wallet.getPreference as jest.Mock).mockResolvedValue([CHAINS_ENUM.ETH]);
    getMatteredChainBalance.mockResolvedValue({
      matteredChainBalances,
      testnetMatteredChainBalances: {},
    });
    (varyAndSortChainItems as jest.Mock).mockReturnValue({
      matteredList: [mainnetChain],
      unmatteredList: [cachedMainnetChain],
    });

    await expect(
      useChainsStore.getState().getOrderedChainList({
        supportChains: [CHAINS_ENUM.ETH],
      })
    ).resolves.toEqual({
      matteredList: [mainnetChain],
      unmatteredList: [cachedMainnetChain],
      firstChain: mainnetChain,
    });
    expect(varyAndSortChainItems).toHaveBeenCalledWith({
      supportChains: [CHAINS_ENUM.ETH],
      pinned: [CHAINS_ENUM.ETH],
      matteredChainBalances,
    });
  });

  test('falls back to empty ordering inputs when dependencies fail', async () => {
    (wallet.getPreference as jest.Mock).mockRejectedValue(
      new Error('preference failed')
    );
    getMatteredChainBalance.mockRejectedValue(new Error('balance failed'));
    (varyAndSortChainItems as jest.Mock).mockReturnValue({
      matteredList: [],
      unmatteredList: [],
    });

    await useChainsStore.getState().getOrderedChainList();

    expect(varyAndSortChainItems).toHaveBeenCalledWith({
      supportChains: undefined,
      pinned: [],
      matteredChainBalances: {},
    });
  });
});
