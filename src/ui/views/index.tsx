import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Route } from 'react-router-dom';
import { WalletProvider, usePopupOpen } from 'ui/utils';

import Dashboard from './Dashboard';
import Unlock from './Unlock';
const AsyncMainRoute = lazy(() => import('./MainRoute'));

const Main = () => {
  usePopupOpen();

  return (
    <Router>
      <Route exact path="/unlock">
        <Unlock />
      </Route>

      <Route exact path="/dashboard">
        <Dashboard />
      </Route>
      <Suspense fallback={null}>
        <AsyncMainRoute />
      </Suspense>
    </Router>
  );
};

const App = ({ wallet }: { wallet: any }) => (
  <WalletProvider wallet={wallet}>
    <Main />
  </WalletProvider>
);

export default App;
