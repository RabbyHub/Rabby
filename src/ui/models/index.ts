import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { contactBook } from './contactBook';
import { viewDashboard } from './viewDashboard';
import { permission } from './permission';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  contactBook: typeof contactBook;
  viewDashboard: typeof viewDashboard;
  permission: typeof permission;
}

export const models: RootModel = {
  app,
  account,
  contactBook,
  viewDashboard,
  permission,
};
