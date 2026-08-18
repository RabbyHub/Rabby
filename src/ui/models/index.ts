import { Models, RematchDispatch, RematchRootState } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { preference } from './preference';
import { accountToDisplay } from './accountToDisplay';
import { importMnemonics } from './importMnemonics';
import { addressManagement } from './addressManagement';
import { transactions } from './transactions';
import { chains } from './chains';
import { customRPC } from './customRPC';
import { bridge } from './bridge';
import { gasAccount } from './gasAccount';
import { exchange } from './exchange';
import { gift } from './gift';
import { perps } from './perps';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  preference: typeof preference;
  accountToDisplay: typeof accountToDisplay;
  importMnemonics: typeof importMnemonics;
  addressManagement: typeof addressManagement;
  transactions: typeof transactions;
  chains: typeof chains;
  customRPC: typeof customRPC;
  bridge: typeof bridge;
  gasAccount: typeof gasAccount;
  exchange: typeof exchange;
  gift: typeof gift;
  perps: typeof perps;
}

export const models: RootModel = {
  app,
  account,
  preference,
  accountToDisplay,
  importMnemonics,
  addressManagement,
  transactions,
  chains,
  customRPC,
  bridge,
  gasAccount,
  exchange,
  gift,
  perps,
};

export type RabbyDispatch = RematchDispatch<RootModel>;
export type RabbyRootState = RematchRootState<RootModel>;
