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
}

export const newUserGuide = createModel<RootModel>()({
  name: 'newUserGuide',

  state: <State>{
    password: '',
    seedPhrase: '',
    privateKey: '',
    gnosis: undefined,
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
