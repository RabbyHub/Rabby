import React, { useEffect, useState } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useWallet } from 'ui/utils';

export const PrivateRouteGuard = ({ children }) => {
  const wallet = useWallet();
  const [isBooted, setIsBooted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const to = !isBooted ? '/welcome' : null;

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const booted = await wallet.isBooted();
      if (cancelled) {
        return;
      }
      setIsBooted(booted);
      setIsReady(true);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

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
