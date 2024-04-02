import { createModel } from '@rematch/core';

import { ConnectedSite } from '@/background/service/permission';

import { RootModel } from '.';
import { CHAINS_ENUM, KEYRING_CLASS } from '@/constant';
import { RabbyRootState } from '../store';
import {
  findChainByEnum,
  getChainList,
  getMainnetChainList,
  getMainnetListFromLocal,
  getTestnetChainList,
  updateChainStore,
  varyAndSortChainItems,
} from '@/utils/chain';
import type { AccountState } from './account';
import { Chain } from '@debank/common';
import { TestnetChain } from '@/background/service/customTestnet';

type IState = {
  currentConnection: ConnectedSite | null | undefined;

  gnosisPendingCount: number;

  gnosisNetworkIds: string[];
  mainnetList: Chain[];
  testnetList: TestnetChain[];
};

export const chains = createModel<RootModel>()({
  name: 'chains',
  state: <IState>{
    currentConnection: null,
    gnosisNetworkIds: [] as string[],
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
  selectors(slice) {
    return {
      isCurrentAccountGnosis() {
        return (rootState: RabbyRootState) => {
          return (
            rootState.account.currentAccount?.type === KEYRING_CLASS.GNOSIS
          );
        };
      },
      isShowGnosisWrongChainAlert() {
        return slice((state) => {
          if (!state.currentConnection) {
            return false;
          }

          const chainItem = findChainByEnum(state.currentConnection.chain);

          return (
            !!chainItem && !state.gnosisNetworkIds.includes(chainItem.network)
          );
        });
      },
    };
  },
  effects: (dispatch) => ({
    init(_: void, store) {
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
