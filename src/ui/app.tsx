import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import BigNumber from 'bignumber.js';
import Views from './views';
import { Message } from '@/utils/message';
import { getUiType, getUITypeName } from 'ui/utils';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/react';
import i18n, { addResourceBundle, changeLanguage } from 'src/i18n';
import { EVENTS } from 'consts';
import browser from 'webextension-polyfill';

import type { WalletControllerType } from 'ui/utils/WalletContext';

import store from './store';

import { isManifestV3 } from '@/utils/env';
import { updateChainStore } from '@/utils/chain';
import { getSentryConfig } from '@/utils/sentry-config';

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

const { PortMessage } = Message;

const portMessageChannel = new PortMessage();

const wallet = new Proxy(
  {},
  {
    get(obj, key) {
      switch (key) {
        case 'openapi':
          return new Proxy(
            {},
            {
              get(obj, key) {
                return function (...params: any) {
                  return portMessageChannel.request({
                    type: 'openapi',
                    method: key,
                    params,
                  });
                };
              },
            }
          );
          break;
        case 'testnetOpenapi':
          return new Proxy(
            {},
            {
              get(obj, key) {
                return function (...params: any) {
                  return portMessageChannel.request({
                    type: 'testnetOpenapi',
                    method: key,
                    params,
                  });
                };
              },
            }
          );
          break;
        case 'fakeTestnetOpenapi':
          return new Proxy(
            {},
            {
              get(obj, key) {
                return function (...params: any) {
                  return portMessageChannel.request({
                    type: 'fakeTestnetOpenapi',
                    method: key,
                    params,
                  });
                };
              },
            }
          );
          break;
        default:
          return function (...params: any) {
            return portMessageChannel.request({
              type: 'controller',
              method: key,
              params,
            });
          };
      }
    },
  }
) as WalletControllerType;

portMessageChannel.on('message', (data) => {
  if (data.event === 'broadcast') {
    eventBus.emit(data.data.type, data.data.data);
  }
});

eventBus.addEventListener(EVENTS.broadcastToBackground, (data) => {
  portMessageChannel.request({
    type: 'broadcast',
    method: data.method,
    params: data.data,
  });
});

store.dispatch.app.initWallet({ wallet });

eventBus.addEventListener('syncChainList', (params) => {
  store.dispatch.chains.setField(params);
  updateChainStore(params);
});

const compensateUnlockedOnceFlag = async () => {
  try {
    if (store.getState().app.hasUnlockedOnce) return;
    const isUnlocked = await wallet.isUnlocked();
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

const renderSentryErrorFallback: Sentry.FallbackRender = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center gap-[16px] bg-rb-neutral-bg-1">
    <div className="text-[16px] font-semibold text-rb-neutral-title-1">
      {i18n.t('global.failed')}
    </div>
    <button
      type="button"
      className="h-[40px] px-[32px] rounded-[16px] bg-rb-brand-light-1 text-rb-brand-default text-[15px] font-semibold hover:bg-rb-brand-light-2"
      onClick={() => window.location.reload()}
    >
      {i18n.t('global.refresh')}
    </button>
  </div>
);

const main = async () => {
  portMessageChannel.connect(getUITypeName());
  await compensateUnlockedOnceFlag();

  store.dispatch.app.initBizStore();
  store.dispatch.chains.init();

  if (getUiType().isPop) {
    wallet.tryOpenOrActiveUserGuide().then((opened) => {
      if (opened) {
        window.close();
      }
    });
  }

  wallet.getLocale().then((locale) => {
    addResourceBundle(locale).then(() => {
      changeLanguage(locale);
      root?.render(
        <Sentry.ErrorBoundary
          fallback={renderSentryErrorFallback}
          beforeCapture={(scope) => scope.setTag('error_boundary', 'root')}
        >
          <Provider store={store}>
            <Views wallet={wallet} />
          </Provider>
        </Sentry.ErrorBoundary>
      );
    });
  });
};

const bootstrap = () => {
  if (!isManifestV3) {
    main();
    return;
  }
  browser.runtime.sendMessage({ type: 'getBackgroundReady' }).then((res) => {
    if (!res) {
      setTimeout(() => {
        bootstrap();
      }, 100);
      return;
    }

    main();
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
