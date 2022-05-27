import type { WalletController } from 'ui/utils/WalletContext';
import { createModel } from '@rematch/core';
import { RootModel } from '.';

export const app = createModel<RootModel>()({
  name: 'app',
  state: {
    /**
     * @description current wallet.
     *
     * @notice same origin with value returned from `useWallet` hooks,
     * we would trigger `initWallet` before this model applied to React Component,
     * so its type could be annotated as `WalletController`
     */
    wallet: (null as any) as WalletController,
  },
  reducers: {
    /**
     * @description only set wallet once
     */
    initWallet(state, payload: { wallet: WalletController }) {
      if (state.wallet) {
        console.warn(
          '[app] store.app.wallet had been initialized so that never re-trigger this effect.'
        );
        return state;
      }

      return {
        ...state,
        wallet: (payload.wallet as unknown) as WalletController,
      };
    },
  },
  effects: (dispatch) => ({
    /**
     * @description call other biz domain's init methods here
     */
    initBizStore() {
      dispatch.account.init();
    },
  }),
});
