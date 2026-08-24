import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import BigNumber from 'bignumber.js';
import Views from './views';
import { getUiType } from 'ui/utils';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/react';
import i18n, { addResourceBundle, changeLanguage } from 'src/i18n';
import browser from 'webextension-polyfill';

import store from './store';
import { initializeSwapStore } from './state/swap';
import { initializeExchangeStore } from './state/exchange';
import {
  initializeWalletStatusStore,
  useWalletStatusStore,
} from './state/walletStatus';
import { initializeChainsStore, useChainsStore } from './state/chains';

import { isManifestV3 } from '@/utils/env';
import { updateChainStore } from '@/utils/chain';
import { getSentryConfig } from '@/utils/sentry-config';
import { Button } from 'antd';
import { wallet } from './wallet';

BigNumber.config({ EXPONENTIAL_AT: [-20, 100] });

Sentry.init(getSentryConfig());

function initAppMeta() {
  const head = document.querySelector('head');
  const icon = document.createElement('link');
  icon.href =
    'https://static-assets.debank.com/files/10eaa959-f65a-4488-8b5a-976aa189bcc4.png';
  icon.rel = 'icon';
  head?.appendChild(icon);
  const name = document.createElement('meta');
  name.name = 'name';
  name.content = 'Rabby';
  head?.appendChild(name);
  const description = document.createElement('meta');
  description.name = 'description';
  description.content = i18n.t('global.appDescription');
  head?.appendChild(description);
}

initAppMeta();

store.dispatch.app.initWallet({ wallet });

eventBus.addEventListener('syncChainList', (params) => {
  useChainsStore.getState().setField(params);
  updateChainStore(params);
});

const compensateUnlockedOnceFlag = () => {
  try {
    if (store.getState().app.hasUnlockedOnce) return;
    const isUnlocked = useWalletStatusStore.getState().isUnlocked;
    if (isUnlocked) {
      store.dispatch.app.setField({
        hasUnlockedOnce: true,
      });
    }
  } catch (e) {
    console.log('[compensateUnlockedOnceFlag] failed', e);
  }
};

const rootContainer = document.getElementById('root');
const root = rootContainer ? createRoot(rootContainer) : null;

const renderSentryErrorFallback: Sentry.FallbackRender = ({
  error,
  componentStack,
  resetError,
}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-[16px] bg-rb-neutral-bg-2">
      <div className="p-[20px] space-y-[8px] max-w-full">
        <h2 className="text-r-neutral-title-1">Something went wrong</h2>
        <details className="text-r-neutral-body overflow-auto">
          <summary>Error details</summary>
          <p>{error?.toString()}</p>
          <p>{componentStack}</p>
        </details>
        <Button type="primary" onClick={resetError}>
          Try again
        </Button>
      </div>
    </div>
  );
};

const main = async () => {
  const walletStatusInitialization = initializeWalletStatusStore().catch(
    (e) => {
      console.error('[main] wallet status initialization failed', e);
      Sentry.captureException(e);
    }
  );
  try {
    await initializeSwapStore();
  } catch (e) {
    // Swap state is not needed to render anything, and the store re-hydrates
    // itself once the background port reconnects. Never block the first paint
    // on it — a blank approval window would strand a pending dapp request.
    console.error('[main] swap store hydration failed', e);
    Sentry.captureException(e);
  }
  await walletStatusInitialization;
  compensateUnlockedOnceFlag();

  store.dispatch.app.initBizStore();
  void initializeExchangeStore();
  void initializeChainsStore();

  if (getUiType().isPop) {
    wallet
      .tryOpenOrActiveUserGuide()
      .then((opened) => {
        if (opened) {
          window.close();
        }
      })
      .catch((e) => {
        console.error('[main] tryOpenOrActiveUserGuide failed', e);
      });
  }

  // `fallbackLng` in src/i18n.ts, already bundled at module load.
  const locale = await wallet.getLocale().catch((e) => {
    console.error('[main] failed to read locale', e);
    return 'en';
  });
  await addResourceBundle(locale).catch((e) => {
    console.error('[main] failed to load locale bundle', locale, e);
  });
  changeLanguage(locale);

  root?.render(
    <Sentry.ErrorBoundary
      fallback={renderSentryErrorFallback}
      beforeCapture={(scope) => {
        scope.setTag('error_boundary', 'root');
      }}
    >
      <Provider store={store}>
        <Views wallet={wallet} />
      </Provider>
    </Sentry.ErrorBoundary>
  );
};

const bootstrap = () => {
  if (!isManifestV3) {
    void main().catch((e) => {
      console.error('[main] bootstrap failed', e);
      Sentry.captureException(e);
    });
    return;
  }

  browser.runtime
    .sendMessage({ type: 'getBackgroundReady' })
    .then((res) => {
      if (!res) {
        setTimeout(bootstrap, 100);
        return;
      }

      void main().catch((e) => {
        console.error('[main] bootstrap failed', e);
        Sentry.captureException(e);
      });
    })
    .catch(() => {
      setTimeout(bootstrap, 100);
    });
};

bootstrap();

const checkSwAlive = () => {
  console.log('[checkSwAlive]', new Date());
  Promise.race([
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    ),
    browser.runtime.sendMessage({
      type: 'ping',
    }),
  ])
    .then(() => {
      console.log('[checkSwAlive] sw is alive');
    })
    .catch((e) => {
      if (e.message === 'timeout') {
        console.log('[checkSwAlive] sw is inactive', e);
        Sentry.captureException(
          'sw is inactive' +
            (browser.runtime.lastError ? ':' + browser.runtime.lastError : '')
        );
      } else {
        console.log('[checkSwAlive] sw is dead');
        Sentry.captureMessage(
          'sw is dead:' +
            e.message +
            (browser.runtime.lastError ? ':' + browser.runtime.lastError : '')
        );
      }
    });
};
checkSwAlive();
