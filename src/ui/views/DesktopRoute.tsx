import React, { useRef } from 'react';
import { Switch, useLocation } from 'react-router-dom';
import { PrivateRoute, PrivateRouteGuard } from 'ui/component';

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
  const isDappIframeRoute = location.pathname === '/desktop/dapp-iframe';
  const hasMountedDappIframeRef = useRef(false);

  if (isDappIframeRoute) {
    hasMountedDappIframeRef.current = true;
  }

  return (
    <>
      <Switch>
        <PrivateRoute exact path="/desktop/profile/:activeTab?">
          <DesktopProfile />
        </PrivateRoute>
      </Switch>
      {hasMountedDappIframeRef.current ? (
        <PrivateRouteGuard>
          <div style={{ display: isDappIframeRoute ? 'block' : 'none' }}>
            <DesktopDappIframe isActive={isDappIframeRoute} />
          </div>
        </PrivateRouteGuard>
      ) : null}

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
