import { createModel } from '@rematch/core';
import { RootModel } from '.';
import type {
  InnerDappFrameServiceStore,
  InnerDappType,
} from '@/background/service';
import { Account } from '@/background/service/preference';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { nanoid } from 'nanoid';
import { DEFAULT_INNER_DAPP_ID } from '@/constant/dappIframe';
import type { INNER_DAPP_ID } from '@/constant/dappIframe';

const uniqueId = nanoid();

export const innerDappFrame = createModel<RootModel>()({
  name: 'innerDappFrame',

  state: {
    innerDappAccounts: {},
    perps: DEFAULT_INNER_DAPP_ID.perps,
    prediction: DEFAULT_INNER_DAPP_ID.prediction,
    lending: DEFAULT_INNER_DAPP_ID.lending,
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
      eventBus.addEventListener(
        EVENTS.INNER_DAPP_CHANGE.ACCOUNT_CHANGED,
        () => {
          this.syncState();
        }
      );

      eventBus.addEventListener(
        EVENTS.INNER_DAPP_CHANGE.DAPP_CHANGED,
        ({ id }: { id: string }) => {
          if (id !== uniqueId) {
            this.syncState();
          }
        }
      );

      return this.syncState();
    },
    async syncState(_: void, store) {
      const data = await store.app.wallet.getInnerDappFrames();
      this.setField({ ...data });
    },
    async setInnerDappAccount([origin, account]: [string, Account], store) {
      this.setField({
        innerDappAccounts: {
          ...store.innerDappFrame.innerDappAccounts,
          [origin]: account,
        },
      });
      await store.app.wallet.setInnerDappAccount(origin, account);

      console.log('setInnerDappAccount', {
        origin,
        account,
      });
    },
    async setInnerDappId(
      payload: { type: InnerDappType; dappId: INNER_DAPP_ID },
      store
    ) {
      this.setField({ [payload.type]: payload.dappId });
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.INNER_DAPP_CHANGE.DAPP_CHANGED,
        params: { id: uniqueId },
      });

      await store.app.wallet.setInnerDappId(payload.type, payload.dappId);
    },
  }),
});
