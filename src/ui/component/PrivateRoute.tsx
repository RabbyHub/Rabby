import React, { useEffect, useState } from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { useWallet } from 'ui/utils';

export const PrivateRouteGuard = ({ children }) => {
  const wallet = useWallet();
  const location = useLocation();
  const [isBooted, setIsBooted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPublicAccountSnapshot, setHasPublicAccountSnapshot] = useState(
    false
  );
  const [isReady, setIsReady] = useState(false);
  const allowWhileLocked = !isUnlocked && hasPublicAccountSnapshot;
  const to = !isBooted
    ? '/welcome'
    : !isUnlocked && !allowWhileLocked
    ? '/unlock'
    : null;

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const [booted, unlocked, hasSnapshot] = await Promise.all([
        wallet.isBooted(),
        wallet.isUnlocked(),
        wallet.hasPublicAccountSnapshot().catch(() => false),
      ]);
      if (cancelled) {
        return;
      }
      setIsBooted(booted);
      setIsUnlocked(unlocked);
      setHasPublicAccountSnapshot(hasSnapshot);
      setIsReady(true);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, wallet]);

  if (!isReady) return <></>;
  return !to ? children : <Redirect to={to} />;
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
