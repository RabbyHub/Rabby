import type { CurrencyStore } from '@/background/service/currency';
import type { SwapServiceStore } from '@/background/service/swap';

export type PersistedStoreMap = {
  currency: CurrencyStore;
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
