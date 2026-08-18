import type { TokenItem } from '@/background/service/openapi';
import { create } from 'zustand';

export type TokenDetailState = {
  selectToken: TokenItem | null;
  popupVisible: boolean;
};

export type SignState = {
  tokenDetail: TokenDetailState;
};

type SignActions = {
  openTokenDetailPopup: (token: TokenItem) => void;
  closeTokenDetailPopup: () => void;
};

export type SignStore = SignState & SignActions;

export function getDefaultTokenDetailState(): TokenDetailState {
  return {
    selectToken: null,
    popupVisible: false,
  };
}

export const useSignStore = create<SignStore>()((set) => ({
  tokenDetail: getDefaultTokenDetailState(),

  openTokenDetailPopup(token) {
    set({
      tokenDetail: {
        selectToken: ({
          ...token,
          amount: undefined,
        } as unknown) as TokenItem,
        popupVisible: true,
      },
    });
  },

  closeTokenDetailPopup() {
    set({ tokenDetail: getDefaultTokenDetailState() });
  },
}));
