import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { viewDashboard } from './viewDashboard';
import { contactBook } from './contactBook';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  viewDashboard: typeof viewDashboard;
  contactBook: typeof contactBook;
}

export const models: RootModel = {
  app,
  account,
  viewDashboard,
  contactBook,
};
