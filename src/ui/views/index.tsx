import React, { lazy, Suspense, useCallback, useEffect } from 'react';
import {
  HashRouter as Router,
  Route,
  useHistory,
  useLocation,
} from 'react-router-dom';
import { useWallet, WalletProvider } from 'ui/utils';
import { PrivateRoute } from 'ui/component';
import Dashboard from './Dashboard';
import Unlock from './Unlock';
import SortHat from './SortHat';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { useIdleTimer } from 'react-idle-timer';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { useMount } from 'react-use';
import { useMemoizedFn } from 'ahooks';
import { useThemeModeOnMain } from '../hooks/usePreference';
const AsyncMainRoute = lazy(() => import('./MainRoute'));

const useAutoLock = () => {
  const history = useHistory();
  const location = useLocation();
  const wallet = useWallet();
  const autoLockTime = useRabbySelector(
    (state) => state.preference.autoLockTime
  );

  const dispatch = useRabbyDispatch();

  useMount(() => {
    dispatch.preference.getPreference('autoLockTime').then((v) => {
      if (v) {
        wallet.setLastActiveTime();
      }
    });
  });

  useIdleTimer({
    onAction() {
      if (autoLockTime > 0) {
        wallet.setLastActiveTime();
      }
    },
    throttle: 1000,
  });

  const listener = useMemoizedFn(() => {
    if (location.pathname !== '/unlock') {
      history.push('/unlock');
    }
  });

  useEffect(() => {
    eventBus.addEventListener(EVENTS.LOCK_WALLET, listener);
    return () => {
      eventBus.removeEventListener(EVENTS.LOCK_WALLET, listener);
    };
  }, [listener]);
};

const Main = () => {
  useAutoLock();
  useThemeModeOnMain();

  return (
    <>
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
    </>
  );
};

const App = ({ wallet }: { wallet: any }) => {
  return (
    <WalletProvider wallet={wallet}>
      <Router>
        <Main />
      </Router>
    </WalletProvider>
  );
};

export default App;
