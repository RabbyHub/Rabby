import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { contactBook } from './contactBook';
import { viewDashboard } from './viewDashboard';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  contactBook: typeof contactBook;
  viewDashboard: typeof viewDashboard;
}

export const models: RootModel = {
  app,
  account,
  contactBook,
  viewDashboard,
};
