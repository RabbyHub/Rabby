import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { accountToDisplay } from './accountToDisplay';
import { createMnemonics } from './createMnemonics';
import { importMnemonics } from './importMnemonics';
import { addressManagement } from './addressManagement';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  accountToDisplay: typeof accountToDisplay;
  createMnemonics: typeof createMnemonics;
  importMnemonics: typeof importMnemonics;
  addressManagement: typeof addressManagement;
}

export const models: RootModel = {
  app,
  account,
  accountToDisplay,
  createMnemonics,
  importMnemonics,
  addressManagement,
};
