import React, { lazy, Suspense, useEffect } from 'react';
import {
  HashRouter as Router,
  Route,
  useHistory,
  useLocation,
} from 'react-router-dom';
import { getUiType, useWallet, WalletProvider } from 'ui/utils';
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
import { useSubscribeCurrentAccountChanged } from '../hooks/backgroundState/useAccount';
import { ForgotPassword } from './ForgotPassword/ForgotPassword';
import { Theme } from '@radix-ui/themes';
import { Toaster } from 'sonner';
import { ClerkProvider } from '@clerk/chrome-extension';

const AsyncMainRoute = lazy(() => import('./MainRoute'));
const isTab = getUiType().isTab;

import '@radix-ui/themes/styles.css';
import '../style/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
      if (autoLockTime > 0 && location.pathname !== '/unlock') {
        wallet.setLastActiveTime();
      }
    },
    throttle: 1000,
  });

  const listener = useMemoizedFn(() => {
    if (location.pathname !== '/unlock') {
      if (isTab) {
        history.replace(
          `/unlock?from=${encodeURIComponent(
            location.pathname + location.search
          )}`
        );
      } else {
        history.push('/unlock');
      }
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
  useSubscribeCurrentAccountChanged();

  return (
    <>
      <Route exact path="/">
        <SortHat />
      </Route>

      <Route exact path="/unlock">
        <Unlock />
      </Route>

      <Route exact path="/forgot-password">
        <ForgotPassword />
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

const PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const SYNC_HOST = process.env.REACT_APP_CLERK_SYNC_HOST;
console.log('PublishABle Key', PUBLISHABLE_KEY, SYNC_HOST);

// if (!PUBLISHABLE_KEY || !SYNC_HOST) {
//   throw new Error(
//     'Please add the PUBLIC_CLERK_PUBLISHABLE_KEY and PUBLIC_CLERK_SYNC_HOST to the .env.development file'
//   );
// }
const EXTENSION_URL = chrome.runtime.getURL('.');

const App = ({ wallet }: { wallet: any }) => {
  const history = useHistory();
  const queryClient = new QueryClient();
  const themeMode = useRabbySelector((state) => state.preference.themeMode);
  let appTheme;

  if (themeMode.toString() === '0') {
    appTheme = 'light';
  } else if (themeMode.toString() === '1') {
    appTheme = 'dark';
  } else {
    appTheme = 'light';
  }

  return (
    <ClerkProvider
      routerPush={(to) => history.push(to)}
      routerReplace={(to) => history.replace(to)}
      publishableKey={
        PUBLISHABLE_KEY ||
        'pk_test_ZGl2ZXJzZS1tb25hcmNoLTc3LmNsZXJrLmFjY291bnRzLmRldiQ'
      }
      afterSignOutUrl="/"
      signInFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
    >
      <Theme
        accentColor="gray"
        appearance={appTheme}
        grayColor="sand"
        radius="large"
        scaling="95%"
      >
        <Toaster
          visibleToasts={2}
          richColors={true}
          duration={4000}
          closeButton={true}
        />
        <QueryClientProvider client={queryClient}>
          <WalletProvider wallet={wallet}>
            <Router>
              <Main />
            </Router>
          </WalletProvider>
        </QueryClientProvider>
      </Theme>
    </ClerkProvider>
  );
};

export default App;
