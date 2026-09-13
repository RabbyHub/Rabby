import type { Chain } from '@debank/common';
import { CHAINS_ENUM } from '@debank/common';
import { create } from 'zustand';

import type { TestnetChain } from '@/background/service/customTestnet';
import type { ConnectedSite } from '@/background/service/permission';
import type { AccountState } from '@/ui/state/account';
import { useAccountStore } from '@/ui/state/account';
import { useSwapStore } from '@/ui/state/swap';
import { wallet } from '@/ui/wallet';
import {
  getChainList,
  getMainnetListFromLocal,
  updateChainStore,
  varyAndSortChainItems,
} from '@/utils/chain';

export type ChainsState = {
  currentConnection: ConnectedSite | null | undefined;
  gnosisPendingCount: number;
  mainnetList: Chain[];
  testnetList: TestnetChain[];
};

export type ChainsActions = {
  setField: (payload: Partial<ChainsState>) => void;
  init: () => Promise<void>;
  getOrderedChainList: (options?: {
    supportChains?: CHAINS_ENUM[];
  }) => Promise<{
    matteredList: Chain[];
    unmatteredList: Chain[];
    firstChain: Chain | undefined;
  }>;
};

export type ChainsStore = ChainsState & ChainsActions;

export const getDefaultChainsState = (): ChainsState => ({
  currentConnection: null,
  gnosisPendingCount: 0,
  mainnetList: getChainList('mainnet'),
  testnetList: getChainList('testnet') as TestnetChain[],
});

export const useChainsStore = create<ChainsStore>()((set) => ({
  ...getDefaultChainsState(),

  setField(payload) {
    set(payload);
  },
  async init() {
    void wallet.getCustomTestnetLogos();
    await Promise.all([
      wallet.getCustomTestnetList().then((testnetList) => {
        updateChainStore({ testnetList });
        set({ testnetList });
      }),
      getMainnetListFromLocal().then((mainnetList) => {
        if (mainnetList.length) {
          updateChainStore({ mainnetList });
          set({ mainnetList });
        }
      }),
    ]);
    useSwapStore.getState().checkStore();
  },
  async getOrderedChainList(options) {
    const { supportChains } = options || {};
    const [pinnedResult, balanceResult] = await Promise.allSettled([
      wallet.getPreference<CHAINS_ENUM[]>('pinnedChain'),
      useAccountStore.getState().getMatteredChainBalance(),
    ]);
    const pinned =
      pinnedResult.status === 'fulfilled' ? pinnedResult.value || [] : [];
    const matteredChainBalances =
      balanceResult.status === 'fulfilled'
        ? balanceResult.value.matteredChainBalances
        : ({} as AccountState['matteredChainBalances']);
    const { matteredList, unmatteredList } = varyAndSortChainItems({
      supportChains,
      pinned,
      matteredChainBalances,
    });

    return {
      matteredList,
      unmatteredList,
      firstChain: matteredList[0],
    };
  },
}));

export const initializeChainsStore = () => useChainsStore.getState().init();

export const chainsActions: ChainsActions = new Proxy({} as ChainsActions, {
  get(_target, property: keyof ChainsActions) {
    return useChainsStore.getState()[property];
  },
});
