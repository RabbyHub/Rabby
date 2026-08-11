import type { Chain } from '@/types/chain';
import { create } from 'zustand';

export type NewUserGuideState = {
  password?: string;
  seedPhrase?: string;
  privateKey?: string;
  gnosis?: {
    address: string;
    chainList: Chain[];
  };
  passphrase?: string;
  clearKeyringId?: number;
};

type NewUserGuideActions = {
  setStore: (partials: Partial<NewUserGuideState>) => void;
  clearStore: () => void;
};

export type NewUserGuideStore = {
  data: NewUserGuideState;
} & NewUserGuideActions;

const createInitialState = (): NewUserGuideState => ({
  password: '',
  seedPhrase: '',
  privateKey: '',
  gnosis: undefined,
  passphrase: '',
});

const createClearedState = (): NewUserGuideState => ({
  password: undefined,
  seedPhrase: undefined,
  privateKey: undefined,
  gnosis: undefined,
  passphrase: undefined,
  clearKeyringId: undefined,
});

export const useNewUserGuideStore = create<NewUserGuideStore>()((set) => ({
  data: createInitialState(),

  setStore(partials) {
    set((state) => ({
      data: {
        ...state.data,
        ...partials,
      },
    }));
  },
  clearStore() {
    set({ data: createClearedState() });
  },
}));
