import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { viewDashboard } from './viewDashboard';
import { permission } from './permission';
import { preference } from './preference';
import { openapi } from './openapi';
import { contactBook } from './contactBook';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  viewDashboard: typeof viewDashboard;
  permission: typeof permission;
  preference: typeof preference;
  openapi: typeof openapi;
  contactBook: typeof contactBook;
}

export const models: RootModel = {
  app,
  account,
  viewDashboard,
  permission,
  preference,
  openapi,
  contactBook,
};
