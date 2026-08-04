import type { SwapServiceStore } from '@/background/service/swap';

export type PersistedStoreMap = {
  swap: SwapServiceStore;
};

export type PersistedStoreKey = keyof PersistedStoreMap;

export type PersistedStorePatch<Key extends PersistedStoreKey> = Partial<
  PersistedStoreMap[Key]
>;

export type PersistedStoreSnapshot<Key extends PersistedStoreKey> = {
  revision: number;
  state: PersistedStoreMap[Key];
};
