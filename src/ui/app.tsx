import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import Views from './views';
import { getUiType } from 'ui/utils';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/react';
import i18n, { addResourceBundle, changeLanguage } from 'src/i18n';

import { initializeSwapStore } from './state/swap';
import { initializeExchangeStore } from './state/exchange';
import { initializeWalletStatusStore } from './state/walletStatus';
import { initializeChainsStore, useChainsStore } from './state/chains';
import { initializeBizStores } from './state/initializeBizStores';

import { isManifestV3 } from '@/utils/env';
import { updateChainStore } from '@/utils/chain';
import { getSentryConfig } from '@/utils/sentry-config';
import { Button } from 'antd';
import { wallet } from './wallet';
import { queryClient } from './query';
import {
  markBackgroundStartupSuccessful,
  reloadForBackgroundRecovery,
  tryReloadForBackgroundRecovery,
  waitForBackgroundReady,
} from './utils/backgroundStartup';

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

eventBus.addEventListener('syncChainList', (params) => {
  useChainsStore.getState().setField(params);
  updateChainStore(params);
});

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

  void initializeBizStores();
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
      <QueryClientProvider client={queryClient}>
        <Views wallet={wallet} />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
};

const renderBackgroundRecovery = (reloading: boolean, signal: AbortSignal) => {
  root?.render(
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-[16px] p-[24px] text-center bg-rb-neutral-bg-2 text-r-neutral-title-1">
      <h2>{reloading ? 'Reloading Rabby' : 'Rabby could not start'}</h2>
      <p className="text-r-neutral-body">
        {reloading
          ? 'This window will close. Please reopen Rabby in a moment.'
          : 'Try reloading Rabby and reopening it. If the problem continues, restart Chrome.'}
      </p>
      {!reloading && (
        <Button
          type="primary"
          onClick={() => {
            renderBackgroundRecovery(true, signal);
            void reloadForBackgroundRecovery({
              trigger: 'manual',
              signal,
            }).catch((error) => {
              console.warn('[background startup] manual reload failed', error);
              if (!signal.aborted) renderBackgroundRecovery(false, signal);
            });
          }}
        >
          Reload Rabby
        </Button>
      )}
    </div>
  );
};

const bootstrap = async () => {
  if (!isManifestV3) {
    await main();
    return;
  }

  const isPopup = getUiType().isPop;
  const startedAt = Date.now();
  const controller = new AbortController();
  window.addEventListener('pagehide', () => controller.abort(), { once: true });
  while (!controller.signal.aborted) {
    const result = await waitForBackgroundReady({
      signal: controller.signal,
      checkHealth: isPopup,
    });
    if (result === 'cancelled') return;
    if (result === 'ready') {
      await main();
      if (isPopup && !controller.signal.aborted) {
        await markBackgroundStartupSuccessful(startedAt);
      }
      return;
    }
    // Only the popup's initial handshake can reload the extension. Notification
    // windows and failures of signing/transaction RPCs never enter recovery.
    const recovery = await tryReloadForBackgroundRecovery({
      signal: controller.signal,
      onReloading: () => renderBackgroundRecovery(true, controller.signal),
    });
    console.warn('[background startup] recovery result:', recovery);
    if (recovery === 'responsive') {
      root?.render(null);
      continue;
    }
    if (recovery === 'blocked' && !controller.signal.aborted) {
      renderBackgroundRecovery(false, controller.signal);
    }
    return;
  }
};

void bootstrap().catch((e) => {
  console.error('[main] bootstrap failed', e);
  Sentry.captureException(e);
});
