import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import Views from './views';
import { getUiType } from 'ui/utils';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/react';
import i18n, { addResourceBundle, changeLanguage } from 'src/i18n';
import browser from 'webextension-polyfill';

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

// Diagnostics for the `bootstrap timeout` report: without them a stuck
// background, a slow cold start and an invalidated extension context all look
// the same in Sentry.
const bootstrapStartedAt = Date.now();
const bootstrapStatus = {
  attempts: 0,
  lastResult: 'pending' as 'pending' | 'not_ready' | 'rejected' | 'ready',
  lastError: '',
  step: 'waitBackground',
  mainError: '',
  timedOut: false,
};

// Counts Reload clicks on the timeout fallback until a later bootstrap
// succeeds. `runtime.reload()` tears the page down before a Sentry request can
// flush, so the outcome is reported by the next UI page that boots instead.
// localStorage (not `browser.storage`) because it survives the reload and still
// works when the page's extension context is already invalidated.
const BOOTSTRAP_RELOAD_KEY = 'bootstrapReload';

type BootstrapReloadRecord = {
  attempts: number;
  lastReloadAt: number;
  lastReloadError?: string;
};

const readBootstrapReload = (): BootstrapReloadRecord | null => {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_RELOAD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeBootstrapReload = (record: BootstrapReloadRecord | null) => {
  try {
    if (record) {
      localStorage.setItem(BOOTSTRAP_RELOAD_KEY, JSON.stringify(record));
    } else {
      localStorage.removeItem(BOOTSTRAP_RELOAD_KEY);
    }
  } catch {
    // Diagnostics only; never block the reload on storage.
  }
};

const reloadFromBootstrapFallback = () => {
  const record: BootstrapReloadRecord = {
    attempts: (readBootstrapReload()?.attempts ?? 0) + 1,
    lastReloadAt: Date.now(),
  };
  writeBootstrapReload(record);
  try {
    browser.runtime.reload();
  } catch (e) {
    writeBootstrapReload({
      ...record,
      lastReloadError: String((e as Error)?.message ?? e),
    });
    // Rethrow so the failure keeps grouping under its existing Sentry issue.
    throw e;
  }
};

const getBootstrapDiagnostics = () => {
  const reload = readBootstrapReload();
  let runtimeContext = 'valid';
  try {
    // Chrome clears `runtime.id` once the page is detached from the extension.
    if (!browser.runtime?.id) runtimeContext = 'invalidated';
  } catch {
    runtimeContext = 'invalidated';
  }
  return {
    tags: {
      bootstrap_step: bootstrapStatus.step,
      bootstrap_last_result: bootstrapStatus.lastResult,
      runtime_context: runtimeContext,
      bootstrap_reload_attempts: reload?.attempts ?? 0,
    },
    extra: {
      ...bootstrapStatus,
      elapsedMs: Date.now() - bootstrapStartedAt,
      visibilityState: document.visibilityState,
      sinceLastReloadMs: reload ? Date.now() - reload.lastReloadAt : null,
      lastReloadError: reload?.lastReloadError ?? null,
    },
  };
};

const main = async () => {
  bootstrapStatus.step = 'swapStore';
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
  bootstrapStatus.step = 'walletStatus';
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
  bootstrapStatus.step = 'locale';
  const locale = await wallet.getLocale().catch((e) => {
    console.error('[main] failed to read locale', e);
    return 'en';
  });
  bootstrapStatus.step = 'localeBundle';
  await addResourceBundle(locale).catch((e) => {
    console.error('[main] failed to load locale bundle', locale, e);
  });
  changeLanguage(locale);

  bootstrapStatus.step = 'render';
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
  clearTimeout(bootstrapTimeoutTimer);
  bootstrapStatus.step = 'done';
  if (readBootstrapReload()) {
    // A Reload from the timeout fallback got the extension booting again.
    Sentry.captureMessage(
      'bootstrap recovered after reload',
      getBootstrapDiagnostics()
    );
    writeBootstrapReload(null);
  } else if (bootstrapStatus.timedOut) {
    // Separates a slow start that recovered from one that never did.
    Sentry.captureMessage(
      'bootstrap recovered after timeout',
      getBootstrapDiagnostics()
    );
  }
};

const BOOTSTRAP_TIMEOUT = 10_000;

const BootstrapTimeoutFallback = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-[16px] bg-rb-neutral-bg-2">
      <div className="p-[20px] flex flex-col items-center gap-[16px] max-w-full text-center">
        <h2 className="text-r-neutral-title-1">Rabby failed to start</h2>
        <p className="text-r-neutral-body">
          The extension background is not responding. Please reload the
          extension and try again.
        </p>
        <Button type="primary" onClick={reloadFromBootstrapFallback}>
          Reload
        </Button>
      </div>
    </div>
  );
};

// `sendMessage` can hang forever when the service worker is stuck, so neither
// `.then` nor `.catch` fires and the retry chain stalls. Cleared once `main`
// renders; if the app renders later anyway, it replaces this fallback.
const bootstrapTimeoutTimer = setTimeout(() => {
  bootstrapStatus.timedOut = true;
  Sentry.captureMessage('bootstrap timeout', getBootstrapDiagnostics());
  root?.render(<BootstrapTimeoutFallback />);
}, BOOTSTRAP_TIMEOUT);

const runMain = () => {
  void main().catch((e) => {
    console.error('[main] bootstrap failed', e);
    bootstrapStatus.mainError = String(e?.message ?? e);
    Sentry.captureException(e);
  });
};

const bootstrap = () => {
  if (!isManifestV3) {
    runMain();
    return;
  }

  bootstrapStatus.attempts += 1;
  browser.runtime
    .sendMessage({ type: 'getBackgroundReady' })
    .then((res) => {
      if (!res) {
        bootstrapStatus.lastResult = 'not_ready';
        setTimeout(bootstrap, 100);
        return;
      }

      bootstrapStatus.lastResult = 'ready';
      runMain();
    })
    .catch((e) => {
      bootstrapStatus.lastResult = 'rejected';
      bootstrapStatus.lastError = String(e?.message ?? e);
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
