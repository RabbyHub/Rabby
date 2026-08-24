import { Models, RematchDispatch } from '@rematch/core';

import { app } from './app';
import type { AccountActions, AccountState } from '@/ui/state/account';
import type {
  AccountToDisplayActions,
  AccountToDisplayState,
} from '@/ui/state/accountToDisplay';
import type {
  AddressManagementActions,
  AddressManagementState,
} from '@/ui/state/addressManagement';
import type { BridgeActions, BridgeState } from '@/ui/state/bridge';
import type { ChainsActions, ChainsState } from '@/ui/state/chains';
import type { GiftActions, GiftState } from '@/ui/state/gift';
import type { GasAccountActions, GasAccountState } from '@/ui/state/gasAccount';
import type { PreferenceActions, PreferenceState } from '@/ui/state/preference';
import type { PerpsActions, PerpsState } from '@/ui/state/perps';

type RabbyModels = {
  app: typeof app;
};

export interface RootModel extends Models<RootModel>, RabbyModels {}

export const models: RootModel = {
  app,
};

export type RabbyDispatch = RematchDispatch<RootModel> & {
  account: AccountActions;
  accountToDisplay: AccountToDisplayActions;
  addressManagement: AddressManagementActions;
  bridge: BridgeActions;
  chains: ChainsActions;
  gift: GiftActions;
  gasAccount: GasAccountActions;
  preference: PreferenceActions;
  perps: PerpsActions;
};
export type RabbyRootState = {
  [Key in keyof RabbyModels]: RabbyModels[Key]['state'];
} & {
  account: AccountState;
  accountToDisplay: AccountToDisplayState;
  addressManagement: AddressManagementState;
  bridge: BridgeState;
  chains: ChainsState;
  gift: GiftState;
  gasAccount: GasAccountState;
  preference: PreferenceState;
  perps: PerpsState;
};
