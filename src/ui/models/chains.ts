import { createModel } from '@rematch/core';

import { ConnectedSite } from '@/background/service/permission';
import Safe from '@rabby-wallet/gnosis-sdk';
import type { SafeInfo } from '@rabby-wallet/gnosis-sdk/dist/api';

import { crossCompareOwners } from '../utils/gnosis';

import { RootModel } from '.';
import { CHAINS, KEYRING_CLASS } from '@/constant';
import { RabbyRootState } from '../store';

type IState = {
  currentConnection: ConnectedSite | null | undefined;

  gnosisPendingCount: number;

  safeInfo: SafeInfo | null;

  gnosisNetworkId: string;
};

export const chains = createModel<RootModel>()({
  name: 'chains',
  state: <IState>{
    currentConnection: null,

    gnosisPendingCount: 0,

    safeInfo: null,

    gnosisNetworkId: '1',
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

          const chain = CHAINS[state.currentConnection.chain];

          return chain.id.toString() !== state.gnosisNetworkId;
        });
      },
    };
  },

  effects: (dispatch) => ({
    async getGnosisPendingCountAsync(_?, store?) {
      if (!store.account.currentAccount) return;
      const currentAccount = store.account.currentAccount;

      const network = await store.app.wallet.getGnosisNetworkId(
        currentAccount.address
      );
      dispatch.chains.setField({ gnosisNetworkId: network });
      const [info, txs] = await Promise.all([
        Safe.getSafeInfo(currentAccount.address, network),
        Safe.getPendingTransactions(currentAccount.address, network),
      ]);
      const owners = await store.app.wallet.getGnosisOwners(
        currentAccount,
        currentAccount.address,
        info.version
      );
      const comparedOwners = crossCompareOwners(owners, info.owners);
      dispatch.chains.setField({
        safeInfo: {
          ...info,
          owners: comparedOwners,
        },
        gnosisPendingCount: txs.results.length,
      });
    },
  }),
});
