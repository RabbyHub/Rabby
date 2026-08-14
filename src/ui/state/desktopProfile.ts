import { CHAINS_ENUM } from '@/types/chain';
import { create } from 'zustand';

export type DesktopAddAddressState = {
  visible: boolean;
  importType: string;
  state?: Record<string, any>;
};

export type DesktopProfileState = {
  chain?: CHAINS_ENUM;
  activeTab: string;
  addAddress: DesktopAddAddressState;
};

type DesktopProfileActions = {
  setChain: (chain?: CHAINS_ENUM) => void;
  setActiveTab: (activeTab: string) => void;
  setAddAddress: (addAddress: DesktopAddAddressState) => void;
};

export type DesktopProfileStore = DesktopProfileState & DesktopProfileActions;

export const useDesktopProfileStore = create<DesktopProfileStore>()((set) => ({
  chain: undefined,
  activeTab: 'tokens',
  addAddress: {
    visible: false,
    importType: '',
  },

  setChain(chain) {
    set({ chain });
  },
  setActiveTab(activeTab) {
    set({ activeTab });
  },
  setAddAddress(addAddress) {
    set({ addAddress });
  },
}));
