import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { createMnemonics } from './createMnemonics';
import { importMnemonics } from './importMnemonics';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  createMnemonics: typeof createMnemonics;
  importMnemonics: typeof importMnemonics;
}

export const models: RootModel = {
  app,
  account,
  createMnemonics,
  importMnemonics,
};
