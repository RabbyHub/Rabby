import { Models, RematchDispatch, RematchRootState } from '@rematch/core';

import { app } from './app';
import { appVersion } from './appVersion';
import { account } from './account';
import { permission } from './permission';
import { preference } from './preference';
import { openapi } from './openapi';
import { contactBook } from './contactBook';
import { accountToDisplay } from './accountToDisplay';
import { createMnemonics } from './createMnemonics';
import { importMnemonics } from './importMnemonics';
import { addressManagement } from './addressManagement';
import { transactions } from './transactions';
import { chains } from './chains';
import { whitelist } from './whitelist';
import { swap } from './swap';
import { customRPC } from './customRPC';
import { securityEngine } from './securityEngine';
import { sign } from './sign';
import { bridge } from './bridge';
import { gasAccount } from './gasAccount';
import { newUserGuide } from './newUserGuide';
import { rateGuidance } from './rateGuidance';
import { exchange } from './exchange';
import { directSubmitTx } from './directSubmitTx';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  appVersion: typeof appVersion;
  account: typeof account;
  permission: typeof permission;
  preference: typeof preference;
  openapi: typeof openapi;
  contactBook: typeof contactBook;
  accountToDisplay: typeof accountToDisplay;
  createMnemonics: typeof createMnemonics;
  importMnemonics: typeof importMnemonics;
  addressManagement: typeof addressManagement;
  transactions: typeof transactions;
  chains: typeof chains;
  whitelist: typeof whitelist;
  swap: typeof swap;
  customRPC: typeof customRPC;
  securityEngine: typeof securityEngine;
  sign: typeof sign;
  bridge: typeof bridge;
  gasAccount: typeof gasAccount;
  newUserGuide: typeof newUserGuide;
  rateGuidance: typeof rateGuidance;
  exchange: typeof exchange;
  directSubmitTx: typeof directSubmitTx;
}

export const models: RootModel = {
  app,
  appVersion,
  account,
  permission,
  preference,
  openapi,
  contactBook,
  accountToDisplay,
  createMnemonics,
  importMnemonics,
  addressManagement,
  transactions,
  chains,
  whitelist,
  swap,
  customRPC,
  securityEngine,
  sign,
  bridge,
  gasAccount,
  newUserGuide,
  rateGuidance,
  exchange,
  directSubmitTx,
};

export type RabbyDispatch = RematchDispatch<RootModel>;
export type RabbyRootState = RematchRootState<RootModel>;
