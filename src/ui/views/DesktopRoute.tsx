import React from 'react';
import { Switch } from 'react-router-dom';
import { PrivateRoute } from 'ui/component';

import { ga4 } from '@/utils/ga4';
import { PortalHost } from '../component/PortalHost';
import { CommonPopup } from './CommonPopup';
import { DesktopProfile } from './DesktopProfile';

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
      </Switch>

      <CommonPopup />
      <PortalHost />
    </>
  );
};

export default Main;
