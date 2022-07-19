import { groupBy } from 'lodash';
import 'reflect-metadata';
import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';
import { browser } from 'webextension-polyfill-ts';
import { ethErrors } from 'eth-rpc-errors';
import { WalletController } from 'background/controller/wallet';
import { Message } from 'utils';
import { CHAINS, EVENTS, KEYRING_CATEGORY_MAP } from 'consts';
import { storage } from './webapi';
import {
  permissionService,
  preferenceService,
  sessionService,
  keyringService,
  openapiService,
  transactionWatchService,
  pageStateCacheService,
  transactionHistoryService,
  contactBookService,
  signTextHistoryService,
  widgetService,
} from './service';
import { providerController, walletController } from './controller';
import { getOriginFromUrl } from '@/utils';
import rpcCache from './utils/rpcCache';
import eventBus from '@/eventBus';
import migrateData from '@/migrations';
import stats from '@/stats';
import createSubscription from './controller/provider/subscriptionManager';
import buildinProvider from 'background/utils/buildinProvider';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { setPopupIcon } from './utils';
import { getSentryEnv } from '@/utils/env';
import ReactGA from 'react-ga';

ReactGA.initialize('UA-199755108-3', { debug: true });
// eslint-disable-next-line @typescript-eslint/no-empty-function
ReactGA.set({ checkProtocolTask: function () {} });
ReactGA.set({ appName: 'Rabby' });
ReactGA.set({ appVersion: process.env.release });
// ReactGA.plugin.require('displayfeatures');

dayjs.extend(utc);

setPopupIcon('default');

const { PortMessage } = Message;

let appStoreLoaded = false;

function forceReconnect(port) {
  deleteTimer(port);
  port.disconnect();
}
function deleteTimer(port) {
  if (port._timer) {
    clearTimeout(port._timer);
    delete port._timer;
  }
}

Sentry.init({
  dsn:
    'https://e871ee64a51b4e8c91ea5fa50b67be6b@o460488.ingest.sentry.io/5831390',
  // integrations: [new Integrations.BrowserTracing()],
  release: process.env.release,
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  environment: getSentryEnv(),
});

// function initAppMeta() {
//   const head = document.querySelector('head');
//   const icon = document.createElement('link');
//   icon.href = 'https://rabby.io/assets/images/logo-128.png';
//   icon.rel = 'icon';
//   head?.appendChild(icon);
//   const name = document.createElement('meta');
//   name.name = 'name';
//   name.content = 'Rabby';
//   head?.appendChild(name);
//   const description = document.createElement('meta');
//   description.name = 'description';
//   description.content = i18n.t('appDescription');
//   head?.appendChild(description);
// }

async function restoreAppState() {
  const keyringState = await storage.get('keyringState');
  keyringService.loadStore(keyringState);
  keyringService.store.subscribe((value) => storage.set('keyringState', value));
  await openapiService.init();

  // Init keyring and openapi first since this two service will not be migrated
  await migrateData();

  await permissionService.init();
  await preferenceService.init();
  await transactionWatchService.init();
  await pageStateCacheService.init();
  await transactionHistoryService.init();
  await contactBookService.init();
  await signTextHistoryService.init();
  await widgetService.init();
  rpcCache.start();

  appStoreLoaded = true;

  transactionWatchService.roll();
  // initAppMeta();
}

restoreAppState();
{
  let interval;
  keyringService.on('unlock', () => {
    if (interval) {
      clearInterval();
    }
    const sendEvent = async () => {
      const time = preferenceService.getSendLogTime();
      if (dayjs(time).utc().isSame(dayjs().utc(), 'day')) {
        return;
      }
      const contacts = contactBookService.listContacts();
      ReactGA.event({
        category: 'User',
        action: 'contactBook',
        label: contacts.length.toString(),
      });
      const chains = preferenceService.getSavedChains();
      ReactGA.event({
        category: 'User',
        action: 'pinnedChains',
        label: chains.join(','),
      });
      const accounts = await walletController.getAccounts();
      const list = accounts.map((account) => {
        const category = KEYRING_CATEGORY_MAP[account.type];
        const action = account.brandName;
        const label =
          (walletController.getAddressCacheBalance(account.address)
            ?.total_usd_value || 0) <= 0;
        return {
          category,
          action,
          label: label ? 'empty' : 'notEmpty',
        };
      });
      const groups = groupBy(list, (item) => {
        return `${item.category}_${item.action}_${item.label}`;
      });
      Object.values(groups).forEach((group) => {
        ReactGA.event({
          ...group[0],
          value: group.length,
        });
      });
      preferenceService.updateSendLogTime(Date.now());
    };
    sendEvent();
    interval = setInterval(sendEvent, 5 * 60 * 1000);
  });

  keyringService.on('lock', () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  });
}

// for page provider
browser.runtime.onConnect.addListener((port) => {
  ReactGA.event({
    category: 'User',
    action: 'enable',
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  port._timer = setTimeout(forceReconnect, 250e3, port);
  port.onDisconnect.addListener(deleteTimer);
  if (
    port.name === 'popup' ||
    port.name === 'notification' ||
    port.name === 'tab'
  ) {
    const pm = new PortMessage(port);
    pm.listen((data) => {
      if (data?.type) {
        switch (data.type) {
          case 'broadcast':
            eventBus.emit(data.method, data.params);
            break;
          case 'openapi':
            if (walletController.openapi[data.method]) {
              return walletController.openapi[data.method].apply(
                null,
                data.params
              );
            }
            break;
          case 'controller':
          default:
            if (data.method) {
              return walletController[data.method].apply(null, data.params);
            }
        }
      }
    });

    const boardcastCallback = (data: any) => {
      pm.request({
        type: 'broadcast',
        method: data.method,
        params: data.params,
      });
    };

    if (port.name === 'popup') {
      preferenceService.setPopupOpen(true);

      port.onDisconnect.addListener(() => {
        preferenceService.setPopupOpen(false);
      });
    }

    eventBus.addEventListener(EVENTS.broadcastToUI, boardcastCallback);
    port.onDisconnect.addListener(() => {
      eventBus.removeEventListener(EVENTS.broadcastToUI, boardcastCallback);
    });

    return;
  }

  if (!port.sender?.tab) {
    return;
  }

  const pm = new PortMessage(port);
  const provider = buildinProvider.currentProvider;
  const subscriptionManager = createSubscription(provider);

  subscriptionManager.events.on('notification', (message) => {
    pm.send('message', {
      event: 'message',
      data: {
        type: message.method,
        data: message.params,
      },
    });
  });

  pm.listen(async (data) => {
    if (!appStoreLoaded) {
      throw ethErrors.provider.disconnected();
    }

    if (data.type === EVENTS.UIToBackground) {
      eventBus.emit(data.type, {
        method: data.method,
        params: data.params,
      });
      return;
    }

    const sessionId = port.sender?.tab?.id;
    if (sessionId === undefined || !port.sender?.url) {
      return;
    }
    const origin = getOriginFromUrl(port.sender.url);
    const session = sessionService.getOrCreateSession(sessionId, origin);

    const req = { data, session };
    // for background push to respective page
    req.session!.setPortMessage(pm);

    if (subscriptionManager.methods[data?.method]) {
      const connectSite = permissionService.getConnectedSite(session!.origin);
      if (connectSite) {
        const chain = CHAINS[connectSite.chain];
        provider.chainId = chain.network;
      }
      return subscriptionManager.methods[data.method].call(null, req);
    }

    return providerController(req);
  });

  port.onDisconnect.addListener((port) => {
    subscriptionManager.destroy();
  });
});

declare global {
  interface Window {
    wallet: WalletController;
  }
}

storage
  .byteInUse()
  .then((byte) => {
    stats.report('byteInUse', { value: byte });
  })
  .catch(() => {
    // IGNORE
  });
