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
      const start = performance.now();
      console.debug('[route-perf][PrivateRoute] guard start', {
        pathname: location.pathname,
        historyLength: window.history.length,
      });
      const [booted, unlocked] = await Promise.all([
        wallet.isBooted(),
        wallet.isUnlocked(),
      ]);
      if (cancelled) {
        console.debug('[route-perf][PrivateRoute] guard cancelled', {
          pathname: location.pathname,
          cost: Math.round(performance.now() - start),
        });
        return;
      }
      console.debug('[route-perf][PrivateRoute] guard resolved', {
        pathname: location.pathname,
        booted,
        unlocked,
        cost: Math.round(performance.now() - start),
      });
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
