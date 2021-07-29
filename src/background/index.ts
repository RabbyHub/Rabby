import 'reflect-metadata';
import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';
import { browser } from 'webextension-polyfill-ts';
import { ethErrors } from 'eth-rpc-errors';
import { WalletController } from 'background/controller/wallet';
import { Message } from 'utils';
import { storage } from './webapi';
import {
  permissionService,
  preferenceService,
  sessionService,
  keyringService,
  chainService,
  openapiService,
  transactionWatchService,
  pageStateCacheService,
} from './service';
import { providerController, walletController } from './controller';

const { PortMessage } = Message;

let appStoreLoaded = false;

Sentry.init({
  dsn:
    'https://e871ee64a51b4e8c91ea5fa50b67be6b@o460488.ingest.sentry.io/5831390',
  integrations: [new Integrations.BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

async function restoreAppState() {
  const keyringState = await storage.get('keyringState');
  keyringService.loadStore(keyringState);
  keyringService.store.subscribe((value) => storage.set('keyringState', value));

  await permissionService.init();
  await preferenceService.init();
  await openapiService.init();
  await chainService.init();
  await transactionWatchService.init();
  await pageStateCacheService.init();

  appStoreLoaded = true;

  transactionWatchService.roll();
}

restoreAppState();

// for page provider
browser.runtime.onConnect.addListener((port) => {
  openapiService.getConfig();

  if (port.name === 'popup') {
    preferenceService.setPopupOpen(true);

    port.onDisconnect.addListener(() => {
      preferenceService.setPopupOpen(false);
    });

    return;
  }

  if (!port.sender?.tab) {
    return;
  }

  const pm = new PortMessage(port);

  pm.listen(async (data) => {
    if (!appStoreLoaded) {
      throw ethErrors.provider.disconnected();
    }

    const sessionId = port.sender?.tab?.id;
    const session = sessionService.getOrCreateSession(sessionId);

    const req = { data, session };
    // for background push to respective page
    req.session.pushMessage = (event, data) => {
      pm.send('message', { event, data });
    };

    return providerController(req);
  });
});

declare global {
  interface Window {
    wallet: WalletController;
  }
}

// for popup operate
window.wallet = new Proxy(walletController, {
  get(target, propKey, receiver) {
    if (!appStoreLoaded) {
      throw ethErrors.provider.disconnected();
    }
    return Reflect.get(target, propKey, receiver);
  },
});
