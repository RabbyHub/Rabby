import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { viewDashboard } from './viewDashboard';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  viewDashboard: typeof viewDashboard;
}

export const models: RootModel = {
  app,
  account,
  viewDashboard,
};
