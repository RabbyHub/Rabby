import { createModel } from '@rematch/core';
import { RootModel } from '.';

import { GasAccountServiceStore } from '@/background/service/gasAccount';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { prefetchGasAccountBridgeSupportTokenList } from '@/ui/views/GasAccount/utils/bridgeSupportTokens';

export const gasAccount = createModel<RootModel>()({
  name: 'gasAccount',

  state: {
    sig: undefined,
    accountId: undefined,
    account: undefined,
    pendingHardwareAccount: undefined,
    autoLoginAccount: undefined,
    accountsWithGasAccountBalance: [],
  } as Partial<GasAccountServiceStore>,

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

  effects: (dispatch) => ({
    init(_: void, store) {
      const logout = () => {
        this.setField({
          sig: undefined,
          account: undefined,
          accountId: undefined,
        });
      };

      const login = () => {
        this.syncState();
      };
      const discoveryUpdated = () => {
        this.syncState();
      };
      eventBus.addEventListener(EVENTS.GAS_ACCOUNT.LOG_OUT, logout);
      eventBus.addEventListener(EVENTS.GAS_ACCOUNT.LOG_IN, login);
      eventBus.addEventListener(
        EVENTS.GAS_ACCOUNT.DISCOVERY_UPDATED,
        discoveryUpdated
      );
      prefetchGasAccountBridgeSupportTokenList({
        wallet: store.app.wallet,
      }).catch((error) => {
        console.error(
          'prefetchBridgeSupportTokenList on gasAccount init error'
        );
        console.error(error);
      });
      return this.syncState();
    },
    async syncState(key: keyof GasAccountServiceStore | undefined, store) {
      if (key) {
        const data = await store.app.wallet.getGasAccountData(key);
        this.setField({
          [key]: data,
        });
        return;
      }

      const wallet = store.app.wallet as any;
      const data = (await wallet.getGasAccountData()) as GasAccountServiceStore;
      this.setField({
        ...data,
      });
    },

    async setGasAccountSig(
      {
        sig,
        account,
      }: {
        sig?: string;
        account?: GasAccountServiceStore['account'];
      },
      store
    ) {
      await store.app.wallet.setGasAccountSig(sig, account);
    },

    async discoverRuntimeState(
      payload: { force?: boolean } | null | undefined,
      store
    ) {
      const data = await store.app.wallet.discoverGasAccountRuntimeState(
        payload
      );
      this.setField(data);
      return data;
    },
  }),
});
