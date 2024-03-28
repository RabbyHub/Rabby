import { createModel } from '@rematch/core';

import { KEYRING_CLASS } from '@/constant';
import { RootModel } from '.';
import { RabbyRootState } from '../store';

interface IState {
  mnemonics: string;

  step: 'risk-check' | 'display';
}

export const createMnemonics = createModel<RootModel>()({
  name: 'createMnemonics',

  state: {
    mnemonics: '',

    step: 'risk-check',
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
    return {
      /**
       * @description it would be only "selected" on referenced due to selectors' feature
       * @returns
       */
      randomMnemonics() {
        return slice((s) =>
          s.mnemonics.split(' ').sort(() => Math.random() - 0.5)
        );
      },

      allHDKeyrings() {
        return (rootState: RabbyRootState) => {
          return rootState.account.keyrings.filter(
            (x) => x.type === KEYRING_CLASS.MNEMONIC
          );
        };
      },
    };
  },

  effects: (dispatch) => ({
    async getAllHDKeyrings(_: void, store) {
      await dispatch.account.getAllClassAccountsAsync();

      store.account.mnemonicAccounts;
    },

    async prepareMnemonicsAsync(_: void, store) {
      const mnemonics =
        (await store.app.wallet.getPreMnemonics()) ||
        (await store.app.wallet.generatePreMnemonic());

      dispatch.createMnemonics.setField({ mnemonics });
    },

    async cleanCreateAsync(_: void, store) {
      await store.app.wallet.removePreMnemonics();
    },

    async stepTo(step: IState['step'], store) {
      dispatch.createMnemonics.setField({ step });
    },

    reset() {
      dispatch.createMnemonics.stepTo('risk-check');
    },
  }),
});
