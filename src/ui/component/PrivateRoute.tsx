import React from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { useWalletStatusStore } from '@/ui/state/walletStatus';

export const PrivateRouteGuard = ({ children }) => {
  const location = useLocation();
  const isBooted = useWalletStatusStore((state) => state.isBooted);
  const isUnlocked = useWalletStatusStore((state) => state.isUnlocked);
  const isInitialized = useWalletStatusStore((state) => state.isInitialized);
  const isSyncing = useWalletStatusStore((state) => state.isSyncing);
  // `from` lets Unlock return here instead of the default page.
  const unlockTo = `/unlock?from=${encodeURIComponent(
    location.pathname + location.search
  )}`;
  const to = !isBooted ? '/welcome' : unlockTo;

  // Initial bootstrap and lifecycle events refresh the authoritative state.
  // Waiting here prevents a stale locked snapshot from bouncing an unlock
  // navigation back to /unlock.
  if (!isInitialized || isSyncing) {
    return <></>;
  }
  // Keep children mounted across route switches (keep-alive).
  if (isUnlocked) {
    return children;
  }
  // Guards keep running on /unlock; redirecting again would nest `from` and loop.
  if (location.pathname === '/unlock') {
    return <></>;
  }
  return <Redirect to={to} />;
};

const PrivateRoute = ({ children, ...rest }) => {
  return (
    <Route
      {...rest}
      render={() => <PrivateRouteGuard>{children}</PrivateRouteGuard>}
    />
  );
};

export default PrivateRoute;
