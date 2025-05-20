import { createModel } from '@rematch/core';

import { ConnectedSite } from '@/background/service/permission';

import { TestnetChain } from '@/background/service/customTestnet';
import { CHAINS_ENUM } from '@/constant';
import {
  getChainList,
  getMainnetListFromLocal,
  updateChainStore,
  varyAndSortChainItems,
} from '@/utils/chain';
import { Chain } from '@debank/common';
import { RootModel } from '.';
import type { AccountState } from './account';

type IState = {
  currentConnection: ConnectedSite | null | undefined;
  gnosisPendingCount: number;
  mainnetList: Chain[];
  testnetList: TestnetChain[];
};

export const chains = createModel<RootModel>()({
  name: 'chains',
  state: <IState>{
    currentConnection: null,
    mainnetList: getChainList('mainnet'),
    testnetList: getChainList('testnet'),
  },
  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },

  effects: (dispatch) => ({
    init(_: void, store) {
      store.app.wallet.getCustomTestnetLogos();
      store.app.wallet.getCustomTestnetList().then((testnetList) => {
        updateChainStore({
          testnetList: testnetList,
        });
        this.setField({ testnetList });
      });
      getMainnetListFromLocal().then((mainnetList) => {
        if (mainnetList.length) {
          updateChainStore({
            mainnetList: mainnetList,
          });
          this.setField({ mainnetList });
        }
      });
    },
    /**
     * @description get all chains current account could access, vary them and sort them
     */
    async getOrderedChainList(
      opts: {
        supportChains?: CHAINS_ENUM[];
      },
      store
    ) {
      const { supportChains } = opts || {};
      const { pinned, matteredChainBalances } = await Promise.allSettled([
        dispatch.preference.getPreference('pinnedChain'),
        dispatch.account.getMatteredChainBalance(),
      ]).then(([pinnedChain, balance]) => {
        return {
          pinned: (pinnedChain.status === 'fulfilled'
            ? pinnedChain.value
            : []) as CHAINS_ENUM[],
          matteredChainBalances: (balance.status === 'fulfilled'
            ? // only SUPPORT mainnet now
              balance.value.matteredChainBalances
            : {}) as AccountState['matteredChainBalances'],
        };
      });

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
  }),
});
