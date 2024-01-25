import { groupBy } from 'lodash';
import 'reflect-metadata';
import * as Sentry from '@sentry/browser';
import browser from 'webextension-polyfill';
import { ethErrors } from 'eth-rpc-errors';
import { WalletController } from 'background/controller/wallet';
import { Message } from '@/utils/message';
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
  whitelistService,
  swapService,
  RabbyPointsService,
  RPCService,
  securityEngineService,
  transactionBroadcastWatchService,
} from './service';
import { providerController, walletController } from './controller';
import i18n from './service/i18n';
import { getOriginFromUrl } from '@/utils';
import rpcCache from './utils/rpcCache';
import eventBus from '@/eventBus';
import migrateData from '@/migrations';
import stats from '@/stats';
import createSubscription from './controller/provider/subscriptionManager';
import buildinProvider from 'background/utils/buildinProvider';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { setPopupIcon, wait } from './utils';
import { getSentryEnv } from '@/utils/env';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { testnetOpenapiService } from './service/openapi';

dayjs.extend(utc);

setPopupIcon('default');

const { PortMessage } = Message;

let appStoreLoaded = false;

Sentry.init({
  dsn:
    'https://e871ee64a51b4e8c91ea5fa50b67be6b@o460488.ingest.sentry.io/5831390',
  release: process.env.release,
  environment: getSentryEnv(),
  ignoreErrors: [
    'Transport error: {"event":"transport_error","params":["Websocket connection failed"]}',
    'Failed to fetch',
    'TransportOpenUserCancelled',
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

async function restoreAppState() {
  const keyringState = await storage.get('keyringState');
  keyringService.loadStore(keyringState);
  keyringService.store.subscribe((value) => storage.set('keyringState', value));
  await openapiService.init();
  await testnetOpenapiService.init();

  // Init keyring and openapi first since this two service will not be migrated
  await migrateData();

  await permissionService.init();
  await preferenceService.init();
  await transactionWatchService.init();
  await transactionBroadcastWatchService.init();
  await pageStateCacheService.init();
  await transactionHistoryService.init();
  await contactBookService.init();
  await signTextHistoryService.init();
  await whitelistService.init();
  await swapService.init();
  await RPCService.init();
  await securityEngineService.init();
  await RabbyPointsService.init();

  rpcCache.start();

  appStoreLoaded = true;

  transactionWatchService.roll();
  transactionBroadcastWatchService.roll();
  initAppMeta();
  startEnableUser();
}

restoreAppState();
{
  let interval: NodeJS.Timeout | null;
  keyringService.on('unlock', () => {
    if (interval) {
      clearInterval(interval);
    }
    const sendEvent = async () => {
      const time = preferenceService.getSendLogTime();
      if (dayjs(time).utc().isSame(dayjs().utc(), 'day')) {
        return;
      }
      const chains = preferenceService.getSavedChains();
      matomoRequestEvent({
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
        matomoRequestEvent({
          category: 'UserAddress',
          action: group[0].category,
          label: [group[0].action, group[0].label, group.length].join('|'),
          value: group.length,
        });
      });
      preferenceService.updateSendLogTime(Date.now());
    };
    sendEvent();
    interval = setInterval(sendEvent, 5 * 60 * 1000);
    // TODO: remove me after 2022.12.31
    const arrangeOldContactAndAlias = async () => {
      const addresses = await keyringService.getAllAdresses();
      const contactMap = contactBookService.getContactsByMap();
      addresses.forEach(({ address }) => {
        const item = contactMap[address];
        if (item && item.isContact && !item.isAlias) {
          contactBookService.addAlias({ name: item.name, address });
        }
      });
    };
    arrangeOldContactAndAlias();
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
          case 'testnetOpenapi':
            if (walletController.testnetOpenapi[data.method]) {
              return walletController.testnetOpenapi[data.method].apply(
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
      pm.send('message', {
        event: 'broadcast',
        data: {
          type: data.method,
          data: data.params,
        },
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
    pm.send('message', {
      event: 'data',
      data: message,
    });
  });

  pm.listen(async (data) => {
    if (!appStoreLoaded) {
      throw ethErrors.provider.disconnected();
    }

    const sessionId = port.sender?.tab?.id;
    if (sessionId === undefined || !port.sender?.url) {
      return;
    }
    const origin = getOriginFromUrl(port.sender.url);
    const session = sessionService.getOrCreateSession(sessionId, origin);
    const req = { data, session, origin };
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

function startEnableUser() {
  const time = preferenceService.getSendEnableTime();
  if (dayjs(time).utc().isSame(dayjs().utc(), 'day')) {
    return;
  }
  matomoRequestEvent({
    category: 'User',
    action: 'enable',
  });
  preferenceService.updateSendEnableTime(Date.now());
}
