import { Models, RematchDispatch } from '@rematch/core';

import { app } from './app';
import { preference } from './preference';
import { accountToDisplay } from './accountToDisplay';
import { addressManagement } from './addressManagement';
import { chains } from './chains';
import { bridge } from './bridge';
import { gasAccount } from './gasAccount';
import { gift } from './gift';
import { perps } from './perps';
import type { AccountActions, AccountState } from '@/ui/state/account';

type RabbyModels = {
  app: typeof app;
  preference: typeof preference;
  accountToDisplay: typeof accountToDisplay;
  addressManagement: typeof addressManagement;
  chains: typeof chains;
  bridge: typeof bridge;
  gasAccount: typeof gasAccount;
  gift: typeof gift;
  perps: typeof perps;
};

export interface RootModel extends Models<RootModel>, RabbyModels {}

export const models: RootModel = {
  app,
  preference,
  accountToDisplay,
  addressManagement,
  chains,
  bridge,
  gasAccount,
  gift,
  perps,
};

export type RabbyDispatch = RematchDispatch<RootModel> & {
  account: AccountActions;
};
export type RabbyRootState = {
  [Key in keyof RabbyModels]: RabbyModels[Key]['state'];
} & {
  account: AccountState;
};
