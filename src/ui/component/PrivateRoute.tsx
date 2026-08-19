import React from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import {
  resolvePrivateRouteDecision,
  useWalletStatusStore,
} from '@/ui/state/walletStatus';

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

  const decision = resolvePrivateRouteDecision({
    isInitialized,
    isSyncing,
    isUnlocked,
    pathname: location.pathname,
  });

  if (decision === 'render') {
    return children;
  }
  if (decision === 'pending') {
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
