import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { Chain } from '@/types/chain';

interface State {
  password?: string;
  seedPhrase?: string;
  privateKey?: string;
  gnosis?: {
    address: string;
    chainList: Chain[];
  };
  passphrase?: string;
  clearKeyringId?: number;
}

export const newUserGuide = createModel<RootModel>()({
  name: 'newUserGuide',

  state: <State>{
    // to do remove debug
    password: process.env.DEBUG ? '11111111' : '',
    seedPhrase: '',
    privateKey: '',
    gnosis: undefined,
    passphrase: '',
  },

  reducers: {
    setState(state, payload: Partial<State>) {
      return {
        ...state,
        ...payload,
      };
    },
  },
});
