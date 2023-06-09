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

          const chain = CHAINS[state.currentConnection.chain];

          return !state.gnosisNetworkIds.includes(chain.network);
        });
      },
    };
  },
});
