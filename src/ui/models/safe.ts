import { GNOSIS_SUPPORT_CHAINS } from './../../constant/index';
import { createModel } from '@rematch/core';

import { ConnectedSite } from '@/background/service/permission';
import Safe from '@rabby-wallet/gnosis-sdk';
import type {
  SafeInfo,
  SafeTransactionItem,
} from '@rabby-wallet/gnosis-sdk/dist/api';

import { crossCompareOwners } from '../utils/gnosis';

import { RootModel } from '.';
import { CHAINS, KEYRING_CLASS } from '@/constant';
import { RabbyRootState } from '../store';
import { CHAINS_ENUM, Chain } from '@debank/common';

type IState = {
  networks: string[];
  loadings: Partial<
    {
      [key in CHAINS_ENUM]: boolean;
    }
  >;
  data: Partial<
    {
      [key in CHAINS_ENUM]: {
        safeInfo: SafeInfo | null;
        chain: Chain;
        pendingTxs: SafeTransactionItem[];
      };
    }
  >;
};

export const safe = createModel<RootModel>()({
  name: 'safe',
  state: <IState>{
    networks: [] as string[],
    loadings: {},
    data: {},
  },
  reducers: {
    setLoading(state, playload: Partial<IState['loadings']>) {
      return {
        ...state,
        loadings: {
          ...state.loadings,
          ...playload,
        },
      };
    },
    setData(state, payload: Partial<IState['data']>) {
      return {
        ...state,
        data: {
          ...state.data,
          ...payload,
        },
      };
    },
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

  selectors(slice, createSelector) {
    return {
      isCurrentAccountGnosis() {
        return (rootState: RabbyRootState) => {
          return (
            rootState.account.currentAccount?.type === KEYRING_CLASS.GNOSIS
          );
        };
      },
      isShowGnosisWrongChainAlert() {
        return (rootState: RabbyRootState) => {
          const state = (rootState as any).safe;
          const chainEnum = rootState.chains.currentConnection?.chain;
          if (!chainEnum) {
            return false;
          }

          const chain = CHAINS[chainEnum];
          return !state.networks.includes(chain.network);
        };
      },
      // isShowGnosisWrongChainAlert() {
      //   return createSelector(
      //     slice,
      //     (rootState) => rootState.chains,
      //     (state, chains) => {
      //       const chainEnum = chains.currentConnection?.chain;
      //       if (!chainEnum) {
      //         return false;
      //       }

      //       const chain = CHAINS[chainEnum];
      //       return !state.networks.includes(chain.network);
      //     }
      //   );
      // },
      gnosisPendingCount() {
        return slice((state) =>
          Object.values(state?.data || {}).reduce((total, item) => {
            return total + (item.pendingTxs || []).length;
          }, 0)
        );
      },
    };
  },

  effects: (dispatch) => ({
    async getAllChainsSafeData(_?, store?) {
      const currentAccount = store?.account.currentAccount;
      if (!currentAccount) {
        return;
      }
      const networks = await store?.app.wallet.getGnosisNetworkId(
        currentAccount.address
      );
      dispatch.safe.setField({
        networks,
      });

      return Promise.all(
        networks.map((networkId) => {
          return this.getSafeData({ networkId });
        })
      );
    },

    async getSafeData(
      payload: {
        networkId?: string;
      },
      store
    ) {
      const { networkId } = payload;
      if (!store.account.currentAccount) return;
      const currentAccount = store.account.currentAccount;
      if (!networkId) {
        return;
      }
      const chain = Object.values(CHAINS).find(
        (item) => item.network === networkId
      );
      if (!chain) {
        return;
      }
      dispatch.safe.setLoading({
        [chain.enum]: true,
      });
      try {
        const [info, txs] = await Promise.all([
          Safe.getSafeInfo(currentAccount.address, networkId),
          Safe.getPendingTransactions(currentAccount.address, networkId),
        ]);
        console.log(
          'info',
          info,
          txs,
          currentAccount,
          currentAccount.address,
          info.version,
          networkId
        );
        const owners = await store.app.wallet.getGnosisOwners(
          currentAccount,
          currentAccount.address,
          info.version,
          networkId
        );
        dispatch.safe.setLoading({
          [chain.enum]: false,
        });
        dispatch.safe.setData({
          [chain.enum]: {
            safeInfo: {
              ...info,
              owners: crossCompareOwners(owners, info.owners),
            },
            pendingTxs: txs.results,
            chain,
          },
        });
      } catch (error) {
        console.error(error);
        dispatch.safe.setLoading({
          [chain.enum]: false,
        });
      }
    },
  }),
});
