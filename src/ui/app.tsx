import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Views from './views';
import { Message } from '@/utils/message';
import { getUITypeName } from 'ui/utils';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/react';
import i18n, { addResourceBundle, changeLanguage } from 'src/i18n';
import { EVENTS } from 'consts';

import type { WalletControllerType } from 'ui/utils/WalletContext';

import store from './store';

import { getSentryEnv, isManifestV3 } from '@/utils/env';
import { updateChainStore } from '@/utils/chain';

Sentry.init({
  dsn:
    'https://a864fbae7ba680ce68816ff1f6ef2c4e@o4507018303438848.ingest.us.sentry.io/4507018389749760',
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
  ],
});

function initAppMeta() {
  const head = document.querySelector('head');
  const icon = document.createElement('link');
  icon.href = 'https://rabby.io/assets/images/logo-128.png';
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
  portMessageChannel.connect(getUITypeName());

  store.dispatch.app.initBizStore();
  store.dispatch.chains.init();

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
  chrome.runtime.sendMessage({ type: 'getBackgroundReady' }).then((res) => {
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
