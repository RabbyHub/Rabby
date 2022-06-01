import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { createMnemonics } from './createMnemonics';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  createMnemonics: typeof createMnemonics;
}

export const models: RootModel = {
  app,
  account,
  createMnemonics,
};
