import React, { lazy, Suspense } from 'react';
import {
  HashRouter as Router,
  Route,
  useLocation,
  Switch,
} from 'react-router-dom';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { WalletProvider } from 'ui/utils';
import { PrivateRoute } from 'ui/component';
import Dashboard from './Dashboard';
import Unlock from './Unlock';
import SortHat from './SortHat';
const AsyncMainRoute = lazy(() => import('./MainRoute'));

const TransitionRoute = () => {
  const location = useLocation();
  return (
    <TransitionGroup>
      <CSSTransition
        key={location.pathname}
        classNames="page-transition"
        timeout={300}
      >
        <Switch location={location}>
          <PrivateRoute exact path="/dashboard">
            <Dashboard />
          </PrivateRoute>
        </Switch>
      </CSSTransition>
    </TransitionGroup>
  );
};

const Main = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <SortHat />
        </Route>
        <Route exact path="/unlock">
          <Unlock />
        </Route>
        <Route path="/dashboard">
          <TransitionRoute />
        </Route>
        <Suspense fallback={null}>
          <AsyncMainRoute />
        </Suspense>
      </Switch>
    </Router>
  );
};

const App = ({ wallet }: { wallet: any }) => {
  return (
    <WalletProvider wallet={wallet}>
      <Main />
    </WalletProvider>
  );
};

export default App;
