import { Models } from '@rematch/core';

import { app } from './app';
import { account } from './account';
import { contactBook } from './contactBook';
import { viewDashboard } from './viewDashboard';
import { permission } from './permission';
import { preference } from './preference';
import { openapi } from './openapi';

export interface RootModel extends Models<RootModel> {
  app: typeof app;
  account: typeof account;
  contactBook: typeof contactBook;
  viewDashboard: typeof viewDashboard;
  permission: typeof permission;
  preference: typeof preference;
  openapi: typeof openapi;
}

export const models: RootModel = {
  app,
  account,
  contactBook,
  viewDashboard,
  permission,
  preference,
  openapi,
};
