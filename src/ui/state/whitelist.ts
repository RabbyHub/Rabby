import type { WhitelistStore as WhitelistServiceStore } from '@/background/service/whitelist';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

const normalizeWhitelist = (addresses: string[]) => {
  if (
    !Array.isArray(addresses) ||
    addresses.some((address) => typeof address !== 'string' || !address)
  ) {
    return null;
  }
  return addresses.map((address) => address.toLowerCase());
};

const isSameWhitelist = (current: string[], next: string[]) => {
  const currentSet = new Set(current);
  const nextSet = new Set(next);

  return (
    current.length === next.length &&
    currentSet.size === current.length &&
    nextSet.size === next.length &&
    current.every((address) => nextSet.has(address)) &&
    next.every((address) => currentSet.has(address))
  );
};

type WhitelistActions = {
  isInWhitelist: (address: string) => boolean;
  updateWhitelistOrder: (addresses: string[]) => void;
};

export type WhitelistStore = WhitelistServiceStore & WhitelistActions;

export const useWhitelistStore = createRabbyStore<WhitelistStore>(
  (set, get) => ({
    enabled: true,
    whitelists: [],

    isInWhitelist(address) {
      return get().whitelists.some(
        (item) => item.toLowerCase() === address.toLowerCase()
      );
    },
    updateWhitelistOrder(addresses) {
      const current = normalizeWhitelist(get().whitelists);
      const next = normalizeWhitelist(addresses);
      if (!current || !next || !isSameWhitelist(current, next)) return;

      set({ whitelists: next });
    },
  }),
  createExtensionStoreOptions<WhitelistStore, 'whitelist'>({
    autoHydrate: true,
    storageKey: 'whitelist',
    onError(error) {
      console.error('[whitelistStore]', error);
    },
  })
);
