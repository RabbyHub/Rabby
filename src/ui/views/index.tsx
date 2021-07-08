import React, { lazy, Suspense, useEffect } from 'react';
import { HashRouter as Router, Route } from 'react-router-dom';
import { WalletProvider } from 'ui/utils';
import { PrivateRoute } from 'ui/component';
import Dashboard from './Dashboard';
import Unlock from './Unlock';
import SortHat from './SortHat';
import i18n, { addResourceBundle } from 'src/i18n';
const AsyncMainRoute = lazy(() => import('./MainRoute'));

const Main = () => (
  <Router>
    <Route exact path="/">
      <SortHat />
    </Route>

    <Route exact path="/unlock">
      <Unlock />
    </Route>

    <PrivateRoute exact path="/dashboard">
      <Dashboard />
    </PrivateRoute>
    <Suspense fallback={null}>
      <AsyncMainRoute />
    </Suspense>
  </Router>
);

const App = ({ wallet }: { wallet: any }) => {
  useEffect(() => {
    const locale = wallet.getLocale();
    addResourceBundle(locale);
    i18n.changeLanguage(locale);
  }, []);

  return (
    <WalletProvider wallet={wallet}>
      <Main />
    </WalletProvider>
  );
};

export default App;
