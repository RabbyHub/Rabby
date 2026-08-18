import { Models, RematchDispatch, RematchRootState } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { preference } from './preference';
import { accountToDisplay } from './accountToDisplay';
import { addressManagement } from './addressManagement';
import { chains } from './chains';
import { bridge } from './bridge';
import { gasAccount } from './gasAccount';
import { gift } from './gift';
import { perps } from './perps';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  preference: typeof preference;
  accountToDisplay: typeof accountToDisplay;
  addressManagement: typeof addressManagement;
  chains: typeof chains;
  bridge: typeof bridge;
  gasAccount: typeof gasAccount;
  gift: typeof gift;
  perps: typeof perps;
}

export const models: RootModel = {
  app,
  account,
  preference,
  accountToDisplay,
  addressManagement,
  chains,
  bridge,
  gasAccount,
  gift,
  perps,
};

export type RabbyDispatch = RematchDispatch<RootModel>;
export type RabbyRootState = RematchRootState<RootModel>;
