import { create } from 'zustand';

import type { GasAccountServiceStore } from '@/background/service/gasAccount';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { wallet } from '@/ui/wallet';
import { prefetchGasAccountBridgeSupportTokenList } from '@/ui/views/GasAccount/utils/bridgeSupportTokens';

type GetGasAccountData = {
  (): Promise<GasAccountServiceStore>;
  <Key extends keyof GasAccountServiceStore>(key: Key): Promise<
    GasAccountServiceStore[Key]
  >;
};

const getGasAccountData = (wallet.getGasAccountData as unknown) as GetGasAccountData;

export type GasAccountState = Partial<GasAccountServiceStore>;

export type GasAccountActions = {
  setField: (payload: GasAccountState) => void;
  init: () => Promise<void>;
  syncState: (key?: keyof GasAccountServiceStore) => Promise<void>;
  setGasAccountSig: (payload: {
    sig?: string;
    account?: GasAccountServiceStore['account'];
  }) => Promise<void>;
  discoverRuntimeState: (
    payload?: { force?: boolean } | null
  ) => Promise<GasAccountServiceStore>;
};

export type GasAccountStore = GasAccountState & GasAccountActions;

export const getDefaultGasAccountState = (): GasAccountState => ({
  sig: undefined,
  accountId: undefined,
  account: undefined,
  pendingHardwareAccount: undefined,
  autoLoginAccount: undefined,
  accountsWithGasAccountBalance: [],
});

export const useGasAccountStore = create<GasAccountStore>()((set, get) => ({
  ...getDefaultGasAccountState(),

  setField(payload) {
    set(payload);
  },
  async init() {
    eventBus.addEventListener(EVENTS.GAS_ACCOUNT.LOG_OUT, () => {
      get().setField({
        sig: undefined,
        account: undefined,
        accountId: undefined,
      });
    });
    eventBus.addEventListener(EVENTS.GAS_ACCOUNT.LOG_IN, () => {
      void get().syncState();
    });
    eventBus.addEventListener(EVENTS.GAS_ACCOUNT.DISCOVERY_UPDATED, () => {
      void get().syncState();
    });

    void prefetchGasAccountBridgeSupportTokenList({ wallet }).catch((error) => {
      console.error('prefetchBridgeSupportTokenList on gasAccount init error');
      console.error(error);
    });

    await get().syncState();
  },
  async syncState(key) {
    if (key) {
      const data = await getGasAccountData(key);
      set({ [key]: data });
      return;
    }

    const data = await getGasAccountData();
    set(data);
  },
  async setGasAccountSig({ sig, account }) {
    await wallet.setGasAccountSig(sig, account);
  },
  async discoverRuntimeState(payload) {
    const data = await wallet.discoverGasAccountRuntimeState(payload);
    set(data);
    return data;
  },
}));

export const initializeGasAccountStore = () =>
  useGasAccountStore.getState().init();

export const gasAccountActions: GasAccountActions = new Proxy(
  {} as GasAccountActions,
  {
    get(_target, property: keyof GasAccountActions) {
      return useGasAccountStore.getState()[property];
    },
  }
);
