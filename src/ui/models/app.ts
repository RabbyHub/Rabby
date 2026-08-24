import type { WalletControllerType } from 'ui/utils/WalletContext';
import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { useAccountStore } from '@/ui/state/account';
import { initializeBridgeStore } from '@/ui/state/bridge';
import { initializeGiftStore } from '@/ui/state/gift';

export const app = createModel<RootModel>()({
  name: 'app',
  state: {
    /**
     * @description current wallet.
     *
     * @notice same origin with value returned from `useWallet` hooks,
     * we would trigger `initWallet` before this model applied to React Component,
     * so its type could be annotated as `WalletControllerType`
     */
    wallet: (null as any) as WalletControllerType,
    hasUnlockedOnce: false,
  },
  reducers: {
    /**
     * @description only set wallet once
     */
    initWallet(state, payload: { wallet: WalletControllerType }) {
      if (state.wallet) {
        console.warn(
          '[app] store.app.wallet had been initialized so that never re-trigger this effect.'
        );
        return state;
      }

      return {
        ...state,
        wallet: (payload.wallet as unknown) as WalletControllerType,
      };
    },
    setField(state, payload: Partial<typeof state>) {
      return {
        ...state,
        ...payload,
      };
    },
  },
  effects: (dispatch) => ({
    /**
     * @description call other biz domain's init methods here
     */
    initBizStore() {
      void (async () => {
        const accountStore = useAccountStore.getState();
        const account = await accountStore.getCurrentAccountAsync();
        await accountStore.onAccountChanged(account?.address);
        await initializeGiftStore();
        await accountStore.getSceneAccountMap();
      })();
      dispatch.preference.init();
      void initializeBridgeStore();
      dispatch.gasAccount.init();
      dispatch.perps.initEventBus();
    },
  }),
});
