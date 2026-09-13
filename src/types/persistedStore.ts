import type { BridgeServiceStore } from '@/background/service/bridge';
import type { ContactBookStore } from '@/background/service/contactBook';
import type { CurrencyStore } from '@/background/service/currency';
import type { CustomRPCServiceStore } from '@/background/service/rpc';
import type { SwapServiceStore } from '@/background/service/swap';
import type { WhitelistStore } from '@/background/service/whitelist';
import type { PublicOpenapiStore } from '@/services/openapi';

export type PersistedStoreMap = {
  bridge: BridgeServiceStore;
  contactBook: ContactBookStore;
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
