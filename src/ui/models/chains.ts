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
});
