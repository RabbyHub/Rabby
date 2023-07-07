import { createModel } from '@rematch/core';

import { ConnectedSite } from '@/background/service/permission';

import { RootModel } from '.';
import { CHAINS_ENUM, KEYRING_CLASS } from '@/constant';
import { RabbyRootState } from '../store';
import { findChainByEnum, varyAndSortChainItems } from '@/utils/chain';
import type { AccountState } from './account';

type IState = {
  currentConnection: ConnectedSite | null | undefined;

  gnosisPendingCount: number;

  gnosisNetworkIds: string[];
};

export const chains = createModel<RootModel>()({
  name: 'chains',
  state: <IState>{
    currentConnection: null,
    gnosisNetworkIds: [] as string[],
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
            ? balance.value
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
