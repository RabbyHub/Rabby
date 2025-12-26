import React from 'react';
import { Switch, useLocation } from 'react-router-dom';
import { PrivateRoute } from 'ui/component';

import { PortalHost } from '../component/PortalHost';
import { CommonPopup } from './CommonPopup';
import { DesktopProfile } from './DesktopProfile';
import { DesktopDappIframe } from './DesktopDappIframe';
import {
  GlobalSignerPortal,
  GlobalTypedDataSignerPortal,
} from '../component/MiniSignV2/components';

declare global {
  interface Window {
    _paq: any;
  }
}

const Main = () => {
  const location = useLocation();
  return (
    <>
      <Switch>
        <PrivateRoute exact path="/desktop/dapp-iframe">
          <DesktopDappIframe />
        </PrivateRoute>
        <PrivateRoute exact path="/desktop/profile/:activeTab?">
          <DesktopProfile />
        </PrivateRoute>
      </Switch>

      {location.pathname !== '/unlock' ? (
        <>
          <CommonPopup />
          <PortalHost />
          <GlobalSignerPortal isDesktop />
          <GlobalTypedDataSignerPortal isDesktop />
        </>
      ) : null}
    </>
  );
};

export default Main;
