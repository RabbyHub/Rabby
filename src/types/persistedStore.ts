import type { CurrencyStore } from '@/background/service/currency';
import type { PublicOpenapiStore } from '@/background/service/openapi';
import type { CustomRPCServiceStore } from '@/background/service/rpc';
import type { SwapServiceStore } from '@/background/service/swap';
import type { WhitelistStore } from '@/background/service/whitelist';

export type PersistedStoreMap = {
  currency: CurrencyStore;
  openapi: PublicOpenapiStore;
  rpc: CustomRPCServiceStore;
  swap: SwapServiceStore;
  whitelist: WhitelistStore;
};

export type PersistedStoreKey = keyof PersistedStoreMap;

export type PersistedStorePatch<Key extends PersistedStoreKey> = Partial<
  PersistedStoreMap[Key]
>;

export type PersistedStoreSnapshot<Key extends PersistedStoreKey> = {
  origin: string;
  revision: number;
  state: PersistedStoreMap[Key];
};
