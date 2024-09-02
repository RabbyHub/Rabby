import { createModel } from '@rematch/core';
import { RootModel } from '.';

import { GasAccountServiceStore } from '@/background/service/gasAccount';

export const gasAccount = createModel<RootModel>()({
  name: 'gasAccount',

  state: {
    sig: undefined,
    accountId: undefined,
    account: undefined,
  } as Partial<GasAccountServiceStore>,

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
    init() {
      return this.syncState();
    },
    async syncState(key: keyof GasAccountServiceStore | undefined, store) {
      const data = await store.app.wallet.getGasAccountData(key);

      this.setField(
        key
          ? {
              [key]: data,
            }
          : {
              ...(data as GasAccountServiceStore),
            }
      );
    },

    async setGasAccountSig(
      {
        sig,
        account,
      }: {
        sig?: string;
        account?: GasAccountServiceStore['account'];
      },
      store
    ) {
      await store.app.wallet.setGasAccountSig(sig, account);

      this.setField({
        sig,
        account,
        accountId: account?.address,
      });
    },
  }),
});
