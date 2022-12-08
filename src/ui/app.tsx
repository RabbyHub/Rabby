// import './wdyr';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Views from './views';
import { Message } from '@/utils';
import { getUITypeName } from 'ui/utils';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import i18n, { addResourceBundle } from 'src/i18n';
import { EVENTS } from 'consts';

import type { WalletControllerType } from 'ui/utils/WalletContext';

import store from './store';

import '../i18n';
import { getSentryEnv } from '@/utils/env';
import { browser } from 'webextension-polyfill-ts';

Sentry.init({
  dsn:
    'https://e871ee64a51b4e8c91ea5fa50b67be6b@o460488.ingest.sentry.io/5831390',
  integrations: [new Integrations.BrowserTracing()],
  release: process.env.release,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  environment: getSentryEnv(),
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Network Error',
    'Request limit exceeded.',
    'Non-Error promise rejection captured with keys: code, message',
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
  description.content = i18n.t('appDescription');
  head?.appendChild(description);
}

initAppMeta();

const { PortMessage } = Message;

const portMessageChannel = new PortMessage();

const ONE_SECOND_IN_MILLISECONDS = 1_000;

// Service Worker Keep Alive Message Constants
const WORKER_KEEP_ALIVE_INTERVAL = ONE_SECOND_IN_MILLISECONDS;
const WORKER_KEEP_ALIVE_MESSAGE = 'WORKER_KEEP_ALIVE_MESSAGE';
const ACK_KEEP_ALIVE_WAIT_TIME = 60_000; // 1 minute

let lastMessageReceivedTimestamp = Date.now();
let ackTimeoutToDisplayError;

portMessageChannel.connect(getUITypeName());

const keepAliveInterval = setInterval(() => {
  portMessageChannel.send('AWAKE', WORKER_KEEP_ALIVE_MESSAGE);
  portMessageChannel.on('message', (msg) => {
    if (msg === 'WORKER_KEEP_ALIVE_MESSAGE') {
      lastMessageReceivedTimestamp = Date.now();
      clearTimeout(ackTimeoutToDisplayError);
    }
  });

  ackTimeoutToDisplayError = setTimeout(() => {
    if (Date.now() - lastMessageReceivedTimestamp > ACK_KEEP_ALIVE_WAIT_TIME) {
      clearInterval(keepAliveInterval);
      // TODO: sw dead, report to sentry
    }
  }, ACK_KEEP_ALIVE_WAIT_TIME);
}, WORKER_KEEP_ALIVE_INTERVAL);

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

portMessageChannel.listen((data) => {
  if (data.type === 'broadcast') {
    eventBus.emit(data.method, data.params);
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
store.dispatch.app.initBizStore();

ReactDOM.render(
  <Provider store={store}>
    <Views wallet={wallet} />
  </Provider>,
  document.getElementById('root')
);
