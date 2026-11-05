import type {
  RemovedToken,
  RemovedTokensServiceStore,
} from '@/background/service/removedTokens';
import { getRemovedTokenKey } from '@/utils/removedTokens';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

type RemovedTokensActions = {
  addRemovedToken: (token: RemovedToken) => Promise<void>;
  removeRemovedToken: (token: RemovedToken) => Promise<void>;
  isTokenRemoved: (token: RemovedToken) => boolean;
  getRemovedTokens: () => RemovedToken[];
};

export type RemovedTokensState = RemovedTokensServiceStore &
  RemovedTokensActions & {
    isReady: boolean;
  };

export const useRemovedTokensStore = createRabbyStore<RemovedTokensState>(
  (set, get) => ({
    removedTokens: [],
    isReady: false,

    async addRemovedToken(token) {
      await useRemovedTokensStore.persist.hydrate();
      const key = getRemovedTokenKey(token);
      set((state) => {
        if (
          state.removedTokens.some((item) => getRemovedTokenKey(item) === key)
        ) {
          return state;
        }
        return {
          removedTokens: [
            { tokenId: token.tokenId, chain: token.chain },
            ...state.removedTokens,
          ],
        };
      });
      await useRemovedTokensStore.persist.flush();
    },
    async removeRemovedToken(token) {
      await useRemovedTokensStore.persist.hydrate();
      const key = getRemovedTokenKey(token);
      set((state) => {
        if (
          !state.removedTokens.some((item) => getRemovedTokenKey(item) === key)
        ) {
          return state;
        }
        return {
          removedTokens: state.removedTokens.filter(
            (item) => getRemovedTokenKey(item) !== key
          ),
        };
      });
      await useRemovedTokensStore.persist.flush();
    },
    isTokenRemoved(token) {
      const key = getRemovedTokenKey(token);
      return get().removedTokens.some(
        (item) => getRemovedTokenKey(item) === key
      );
    },
    getRemovedTokens() {
      return get().removedTokens.map((token) => ({ ...token }));
    },
  }),
  createExtensionStoreOptions<RemovedTokensState, 'removedTokens'>({
    storageKey: 'removedTokens',
    partialize: (state) => ({ removedTokens: state.removedTokens }),
    merge: (persistedState, currentState) => ({
      ...currentState,
      ...persistedState,
      isReady: true,
    }),
    onError(error) {
      console.error('[removedTokensStore]', error);
    },
  })
);
