import React, { useEffect, useState } from 'react';
import { Route, Navigate, RouteProps } from 'react-router-dom';
import { useWallet } from 'ui/utils';

const Wrap = ({ children }) => {
  const wallet = useWallet();
  const [isBooted, setIsBooted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const to = !isBooted ? '/welcome' : !isUnlocked ? '/unlock' : null;

  const init = async () => {
    setIsBooted(await wallet.isBooted());
    setIsUnlocked(await wallet.isUnlocked());
    setIsReady(true);
  };

  useEffect(() => {
    init();
  }, []);

  if (!isReady) return <></>;
  return !to ? children : <Navigate to={to} />;
};

const PrivateRoute = ({ children, ...rest }: RouteProps) => {
  return <Route {...rest} element={() => <Wrap>{children}</Wrap>} />;
};

export default PrivateRoute;
