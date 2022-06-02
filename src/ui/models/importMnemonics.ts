import { createModel } from '@rematch/core';

import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { RootModel } from '.';
import { RabbyRootState } from '../store';

interface IState {
  stashKeyringId: number | null;
  mnemonicsCounter: number | null;
}

export const importMnemonics = createModel<RootModel>()({
  name: 'importMnemonics',

  state: {
    /**
     * @description current importing keyring's id
     */
    stashKeyringId: null,

    mnemonicsCounter: -1,
  } as IState,

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
    return {};
  },

  effects: (dispatch) => ({
    async getMnemonicsCounterAsync(_?, store?) {
      const typedAccounts = await store.app.wallet.getAllClassAccounts();
      const len = typedAccounts.filter(
        (list) => list.keyring.type === KEYRING_TYPE.HdKeyring
      ).length;

      dispatch.importMnemonics.setField({ mnemonicsCounter: len });
    },
  }),
});
