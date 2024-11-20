import { createModel } from '@rematch/core';
import { RootModel } from '.';

interface State {
  password?: string;
  seedPhrase?: string;
  privateKey?: string;
}

export const newUserGuide = createModel<RootModel>()({
  name: 'newUserGuide',

  state: <State>{
    password: '',
    seedPhrase: '',
    privateKey: '',
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
