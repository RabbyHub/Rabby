import React, { useEffect, useState } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useWallet } from 'ui/utils';

const PrivateRoute = ({ children, ...rest }) => {
  const wallet = useWallet();
  const [isBooted, setIsBooted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const init = async () => {
    setIsBooted(await wallet.isBooted());
    setIsUnlocked(await wallet.isUnlocked());
    setIsReady(true);
  };

  useEffect(() => {
    init();
  }, []);

  if (!isReady) return <></>;

  return (
    <Route
      {...rest}
      render={() => {
        const to = !isBooted ? '/welcome' : !isUnlocked ? '/unlock' : null;

        return !to ? children : <Redirect to={to} />;
      }}
    />
  );
};

export default PrivateRoute;
