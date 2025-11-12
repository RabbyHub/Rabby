import React from 'react';
import { Switch, useLocation } from 'react-router-dom';
import { PrivateRoute } from 'ui/component';

import { PortalHost } from '../component/PortalHost';
import { CommonPopup } from './CommonPopup';
import { DesktopProfile } from './DesktopProfile';
import { GlobalSignerPortal } from '../component/MiniSignV2/components/GlobalSignerPortal';

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
        <PrivateRoute exact path="/desktop/profile/:activeTab?">
          <DesktopProfile />
        </PrivateRoute>
      </Switch>

      {location.pathname !== '/unlock' ? (
        <>
          <CommonPopup />
          <PortalHost />
          <GlobalSignerPortal isDesktop />
        </>
      ) : null}
    </>
  );
};

export default Main;
