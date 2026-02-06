import { createModel } from '@rematch/core';
import { RootModel } from '.';
import type {
  InnerDappFrameServiceStore,
  InnerDappType,
} from '@/background/service';
import { Account } from '@/background/service/preference';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

export const innerDappFrame = createModel<RootModel>()({
  name: 'innerDappFrame',

  state: {
    innerDappAccounts: {},
    perps: 'hyperliquid',
    prediction: 'polymarket',
    lending: 'aave',
  } as InnerDappFrameServiceStore,

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
    init() {
      eventBus.addEventListener(EVENTS.INNER_DAPP_ACCOUNT.CHANGED, () => {
        this.syncState();
      });
      return this.syncState();
    },
    async syncState(_: void, store) {
      const data = await store.app.wallet.getInnerDappFrames();
      console.log('innerDappFrame syncState', data);
      this.setField({ ...data });
    },
    async setInnerDappAccount([origin, account]: [string, Account], store) {
      this.setField({
        innerDappAccounts: {
          ...store.innerDappFrame.innerDappAccounts,
          [origin]: account,
        },
      });
      console.log('setInnerDappAccount', origin, account);
      await store.app.wallet.setInnerDappAccount(origin, account);
    },
    async setInnerDappId(
      payload: { type: InnerDappType; dappId: string },
      store
    ) {
      this.setField({ [payload.type]: payload.dappId });
      await store.app.wallet.setInnerDappId(payload.type, payload.dappId);
    },
  }),
});
