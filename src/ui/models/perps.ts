import { createModel } from '@rematch/core';
import { ClearinghouseState } from '@rabby-wallet/hyperliquid-sdk';
import { Account } from '@/background/service/preference';
import { RootModel } from '.';
import { destroyPerpsSDK, getPerpsSDK } from '@/ui/views/Perps/sdkManager';

export interface PerpsState {
  clearinghouseState: ClearinghouseState | null;
  currentPerpsAccount: Account | null;
  isLogin: boolean;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export const perps = createModel<RootModel>()({
  state: {
    clearinghouseState: null,
    currentPerpsAccount: null,
    isLogin: false,
    loading: false,
    error: null,
    isInitialized: false,
  } as PerpsState,

  reducers: {
    setClearinghouseState(state, payload: ClearinghouseState | null) {
      return {
        ...state,
        clearinghouseState: payload,
      };
    },

    setCurrentPerpsAccount(state, payload: Account | null) {
      return {
        ...state,
        currentPerpsAccount: payload,
        isLogin: !!payload,
      };
    },

    setLoading(state, payload: boolean) {
      return {
        ...state,
        loading: payload,
      };
    },

    setError(state, payload: string | null) {
      return {
        ...state,
        error: payload,
      };
    },

    setInitialized(state, payload: boolean) {
      return {
        ...state,
        isInitialized: payload,
      };
    },

    resetState(state) {
      return {
        ...state,
        clearinghouseState: null,
        currentPerpsAccount: null,
        isLogin: false,
        loading: false,
        error: null,
        isInitialized: false,
      };
    },
  },

  effects: (dispatch) => ({
    async fetchClearinghouseState(address: string) {
      try {
        dispatch.perps.setLoading(true);
        dispatch.perps.setError(null);

        const sdk = getPerpsSDK();

        if (!sdk) {
          throw new Error('Perps SDK not initialized');
        }

        const clearinghouseState = await sdk.info.getClearingHouseState(
          address
        );
        dispatch.perps.setClearinghouseState(clearinghouseState);
      } catch (error: any) {
        console.error('Failed to fetch clearinghouse state:', error);
        dispatch.perps.setError(error.message || 'Failed to fetch data');
      } finally {
        dispatch.perps.setLoading(false);
      }
    },

    async refreshData(_, rootState) {
      const { currentPerpsAccount } = rootState.perps;
      if (currentPerpsAccount?.address) {
        await dispatch.perps.fetchClearinghouseState(
          currentPerpsAccount.address
        );
      }
    },

    logout() {
      destroyPerpsSDK();

      dispatch.perps.resetState();
    },
  }),
});

export default perps;
