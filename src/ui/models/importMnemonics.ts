import { createModel } from '@rematch/core';

import { KEYRING_CLASS } from '@/constant';
import { RootModel } from '.';
import { RabbyRootState } from '../store';

interface IState {
  stashKeyringId: number | null;
}

export const importMnemonics = createModel<RootModel>()({
  name: 'importMnemonics',

  state: {
    /**
     * @description current importing keyring's id
     */
    stashKeyringId: null,
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

  effects: (dispatch) => ({}),
});
