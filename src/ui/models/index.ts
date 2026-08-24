import { Models, RematchDispatch } from '@rematch/core';

import { app } from './app';
import { preference } from './preference';
import { chains } from './chains';
import { gasAccount } from './gasAccount';
import { gift } from './gift';
import { perps } from './perps';
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

type RabbyModels = {
  app: typeof app;
  preference: typeof preference;
  chains: typeof chains;
  gasAccount: typeof gasAccount;
  gift: typeof gift;
  perps: typeof perps;
};

export interface RootModel extends Models<RootModel>, RabbyModels {}

export const models: RootModel = {
  app,
  preference,
  chains,
  gasAccount,
  gift,
  perps,
};

export type RabbyDispatch = RematchDispatch<RootModel> & {
  account: AccountActions;
  accountToDisplay: AccountToDisplayActions;
  addressManagement: AddressManagementActions;
  bridge: BridgeActions;
};
export type RabbyRootState = {
  [Key in keyof RabbyModels]: RabbyModels[Key]['state'];
} & {
  account: AccountState;
  accountToDisplay: AccountToDisplayState;
  addressManagement: AddressManagementState;
  bridge: BridgeState;
};
