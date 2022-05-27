import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
}

export const models: RootModel = {
  app,
  account,
};
