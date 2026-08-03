import type { SwapServiceStore } from '@/background/service/swap';

export type PersistedStoreMap = {
  swap: SwapServiceStore;
};

export type PersistedStoreKey = keyof PersistedStoreMap;
