import React from 'react';
import { Switch } from 'react-router-dom';
import { PrivateRoute } from 'ui/component';

import { ga4 } from '@/utils/ga4';
import { PortalHost } from '../component/PortalHost';
import { CommonPopup } from './CommonPopup';
import { DesktopProfile } from './DesktopProfile';
import { SyncToMobile } from '../utils/SyncToMobile/SyncToMobile';
import { DappSearchPage } from './DappSearch';

declare global {
  interface Window {
    _paq: any;
  }
}

const Main = () => {
  return (
    <>
      <Switch>
        <PrivateRoute exact path="/desktop/profile/:activeTab?">
          <DesktopProfile />
        </PrivateRoute>
        <PrivateRoute exact path="/desktop/sync">
          <SyncToMobile />
        </PrivateRoute>
        <PrivateRoute exact path="/desktop/dapp-search">
          <DappSearchPage />
        </PrivateRoute>
      </Switch>

      <CommonPopup />
      <PortalHost />
    </>
  );
};

export default Main;
