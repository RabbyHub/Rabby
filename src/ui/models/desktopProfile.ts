import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { CHAINS_ENUM } from '@/types/chain';

export interface DesktopProfileState {
  chain?: CHAINS_ENUM;
  activeTab?: string;
}

export const desktopProfile = createModel<RootModel>()({
  state: {
    chain: undefined,
    activeTab: 'tokens',
  } as DesktopProfileState,

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload || {}).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },

  effects: (dispatch) => ({}),
});
