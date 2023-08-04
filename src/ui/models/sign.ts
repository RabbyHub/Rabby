import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { TokenItem } from 'background/service/openapi';

interface SignState {
  tokenDetail: {
    selectToken: TokenItem | null;
    popupVisible: boolean;
  };
}

export const sign = createModel<RootModel>()({
  name: 'sign',

  state: {
    tokenDetail: {
      selectToken: null,
      popupVisible: false,
    },
  } as SignState,

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
    setTokenDetail(state, payload: SignState['tokenDetail']) {
      return {
        ...state,
        tokenDetail: payload,
      };
    },
  },

  effects: (dispatch) => ({
    openTokenDetailPopup(token: TokenItem) {
      dispatch.sign.setTokenDetail({
        selectToken: ({
          ...token,
          amount: undefined,
        } as unknown) as TokenItem,
        popupVisible: true,
      });
    },
    closeTokenDetailPopup() {
      dispatch.sign.setTokenDetail({
        selectToken: null,
        popupVisible: false,
      });
    },
  }),
});
