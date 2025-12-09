import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Views from './views';
import { Message } from '@/utils/message';
import { getUiType, getUITypeName, openInTab } from 'ui/utils';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/react';
import i18n, { addResourceBundle, changeLanguage } from 'src/i18n';
import { EVENTS } from 'consts';
import browser from 'webextension-polyfill';

import type { WalletControllerType } from 'ui/utils/WalletContext';

import store from './store';

import { getSentryEnv, isManifestV3 } from '@/utils/env';
import { updateChainStore } from '@/utils/chain';

Sentry.init({
  dsn:
    'https://f4a992c621c55f48350156a32da4778d@o4507018303438848.ingest.us.sentry.io/4507018389749760',
  release: process.env.release,
  environment: getSentryEnv(),
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Network Error',
    'Request limit exceeded.',
    'Non-Error promise rejection captured with keys: code, message',
    'Non-Error promise rejection captured with keys: message, stack',
    'Failed to fetch',
    'Non-Error promise rejection captured with keys: message',
    /Non-Error promise rejection captured/,
    /\[From .*\]/, // error from custom rpc
    /AxiosError/,
    /WebSocket connection failed/,
  ],
});

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

const main = () => {
  console.log('name', getUITypeName());
  portMessageChannel.connect(getUITypeName());

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
      ReactDOM.render(
        <Provider store={store}>
          <Views wallet={wallet} />
        </Provider>,
        document.getElementById('root')
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
