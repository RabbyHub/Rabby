import React, { useEffect, useState } from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { useWallet } from 'ui/utils';

export const PrivateRouteGuard = ({ children }) => {
  const wallet = useWallet();
  const location = useLocation();
  const [isBooted, setIsBooted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const to = !isBooted ? '/welcome' : !isUnlocked ? '/unlock' : null;

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const [booted, unlocked] = await Promise.all([
        wallet.isBooted(),
        wallet.isUnlocked(),
      ]);
      if (cancelled) {
        return;
      }
      setIsBooted(booted);
      setIsUnlocked(unlocked);
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
