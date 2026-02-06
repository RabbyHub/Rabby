import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PrivateRouteGuard } from 'ui/component';

import { PortalHost } from '../component/PortalHost';
import { CommonPopup } from './CommonPopup';
import { DesktopProfile } from './DesktopProfile';
import { DesktopInnerDapp } from './DesktopDappIframe';
import {
  GlobalSignerPortal,
  GlobalTypedDataSignerPortal,
} from '../component/MiniSignV2/components';
import { DesktopLending } from './DesktopLending';
import clsx from 'clsx';
import { DesktopPerpsEntry } from './DesktopPerps/entry';
import { DesktopLendingEntry } from './DesktopLending/entry';
import { AddAddressModal } from './DesktopProfile/components/AddAddressModal';
import { useRabbyDispatch } from '../store';
import { useEventBusListener } from '../hooks/useEventBusListener';
import { EVENTS } from '@/constant';
import { useMemoizedFn } from 'ahooks';
import { onBackgroundStoreChanged } from '../utils/broadcastToUI';

declare global {
  interface Window {
    _paq: any;
  }
}

const Main = () => {
  const location = useLocation();
  const isDappIframeRoute = location.pathname === '/desktop/prediction';
  const isPerpsRoute = location.pathname === '/desktop/perps';
  const isProfileRoute = location.pathname.startsWith('/desktop/profile');
  const isLendingRoute = location.pathname === '/desktop/lending';

  const hasMountedDappIframeRef = useRef(false);
  const hasMountedPerpsRef = useRef(false);
  const hasMountedProfileRef = useRef(false);
  const hasMountedLendingRef = useRef(false);

  if (isDappIframeRoute) {
    hasMountedDappIframeRef.current = true;
  }
  if (isPerpsRoute) {
    hasMountedPerpsRef.current = true;
  }
  if (isProfileRoute) {
    hasMountedProfileRef.current = true;
  }
  if (isLendingRoute) {
    hasMountedLendingRef.current = true;
  }

  const dispatch = useRabbyDispatch();

  const fetchAllAccounts = useMemoizedFn(() =>
    dispatch.addressManagement.getHilightedAddressesAsync().then(() => {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    })
  );

  useEventBusListener(EVENTS.PERSIST_KEYRING, fetchAllAccounts);
  useEventBusListener(EVENTS.RELOAD_ACCOUNT_LIST, async () => {
    await dispatch.preference.getPreference('addressSortStore');
    fetchAllAccounts();
  });

  useEffect(() => {
    return onBackgroundStoreChanged('contactBook', (payload) => {
      fetchAllAccounts();
    });
  }, [fetchAllAccounts]);

  return (
    <>
      {hasMountedProfileRef.current ? (
        <PrivateRouteGuard>
          <DesktopProfile
            isActive={isProfileRoute}
            style={isProfileRoute ? undefined : { display: 'none' }}
          />
        </PrivateRouteGuard>
      ) : null}
      {hasMountedPerpsRef.current ? (
        <PrivateRouteGuard>
          <div
            style={{ display: isPerpsRoute ? 'block' : 'none' }}
            className={clsx('h-full', isPerpsRoute ? 'block' : 'hidden')}
          >
            {/* <DesktopPerps isActive={isPerpsRoute} /> */}
            <DesktopPerpsEntry isActive={isPerpsRoute} />
          </div>
        </PrivateRouteGuard>
      ) : null}
      {hasMountedDappIframeRef.current ? (
        <PrivateRouteGuard>
          <div
            style={{ display: isDappIframeRoute ? 'block' : 'none' }}
            className={clsx('h-full', isDappIframeRoute ? 'block' : 'hidden')}
          >
            <DesktopInnerDapp
              isActive={isDappIframeRoute}
              type={'prediction'}
            />
          </div>
        </PrivateRouteGuard>
      ) : null}

      {hasMountedLendingRef.current ? (
        <PrivateRouteGuard>
          <div
            style={{ display: isLendingRoute ? 'block' : 'none' }}
            className={clsx('h-full', isLendingRoute ? 'block' : 'hidden')}
          >
            <DesktopLendingEntry isActive={isLendingRoute} />
          </div>
        </PrivateRouteGuard>
      ) : null}

      {hasMountedLendingRef.current ? (
        <PrivateRouteGuard>
          <div
            style={{ display: isLendingRoute ? 'block' : 'none' }}
            className={clsx('h-full', isLendingRoute ? 'block' : 'hidden')}
          >
            <DesktopLending isActive={isLendingRoute} />
          </div>
        </PrivateRouteGuard>
      ) : null}

      {location.pathname !== '/unlock' ? (
        <>
          <CommonPopup />
          <PortalHost />
          <GlobalSignerPortal isDesktop />
          <GlobalTypedDataSignerPortal isDesktop />
          <AddAddressModal />
        </>
      ) : null}
    </>
  );
};

export default Main;
