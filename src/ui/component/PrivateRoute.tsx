import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useWallet } from 'ui/utils';

const PrivateRoute = ({ children, ...rest }) => {
  const wallet = useWallet();

  return (
    <Route
      {...rest}
      render={() => {
        const to = !wallet.isBooted()
          ? '/welcome'
          : !wallet.isUnlocked()
          ? '/unlock'
          : null;

        return !to ? children : <Redirect to={to} />;
      }}
    />
  );
};

export default PrivateRoute;
