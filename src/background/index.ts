import { groupBy } from 'lodash';
import 'reflect-metadata';
import * as Sentry from '@sentry/browser';
import browser from 'webextension-polyfill';
import { ethErrors } from 'eth-rpc-errors';
import { WalletController } from 'background/controller/wallet';
import { Message } from '@/utils/message';
import {
  CHAINS,
  CHAINS_ENUM,
  EVENTS,
  EVENTS_IN_BG,
  KEYRING_CATEGORY_MAP,
} from 'consts';
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
  HDKeyRingLastAddAddrTimeService,
} from './service';
import { providerController, walletController } from './controller';
import { getOriginFromUrl } from '@/utils';
import rpcCache from './utils/rpcCache';
import eventBus from '@/eventBus';
import migrateData from '@/migrations';
import createSubscription from './controller/provider/subscriptionManager';
import buildinProvider from 'background/utils/buildinProvider';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { setPopupIcon } from './utils';
import { appIsDev, getSentryEnv } from '@/utils/env';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { testnetOpenapiService } from './service/openapi';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import Safe from '@rabby-wallet/gnosis-sdk';
import { customTestnetService } from './service/customTestnet';
import { findChain } from '@/utils/chain';
import { syncChainService } from './service/syncChain';

Safe.adapter = fetchAdapter as any;

dayjs.extend(utc);

const { PortMessage } = Message;

let appStoreLoaded = false;

Sentry.init({
  dsn:
    'https://a864fbae7ba680ce68816ff1f6ef2c4e@o4507018303438848.ingest.us.sentry.io/4507018389749760',
  release: process.env.release,
  environment: getSentryEnv(),
  ignoreErrors: [
    'Transport error: {"event":"transport_error","params":["Websocket connection failed"]}',
    'Failed to fetch',
    'TransportOpenUserCancelled',
    'Non-Error promise rejection captured with keys: message, stack',
  ],
});

async function restoreAppState() {
  const keyringState = await storage.get('keyringState');
  keyringService.loadStore(keyringState);
  keyringService.store.subscribe((value) => storage.set('keyringState', value));
  await openapiService.init();
  await testnetOpenapiService.init();

  // Init keyring and openapi first since this two service will not be migrated
  await migrateData();

  await customTestnetService.init();
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
  await HDKeyRingLastAddAddrTimeService.init();

  setPopupIcon(
    walletController.isUnlocked() || !walletController.isBooted()
      ? 'default'
      : 'locked'
  );

  rpcCache.start();

  appStoreLoaded = true;

  syncChainService.roll();
  transactionWatchService.roll();
  transactionBroadcastWatchService.roll();
  startEnableUser();
  walletController.syncMainnetChainList();

  eventBus.addEventListener(EVENTS_IN_BG.ON_TX_COMPLETED, ({ address }) => {
    if (!address) return;

    walletController.forceExpireInMemoryAddressBalance(address);
    walletController.forceExpireInMemoryNetCurve(address);
  });

  if (appIsDev) {
    globalThis._forceExpireBalanceAboutData = (address: string) => {
      eventBus.emit(EVENTS_IN_BG.ON_TX_COMPLETED, { address });
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getBackgroundReady') {
      sendResponse({
        data: {
          ready: true,
        },
      });
    }
  });
}

restoreAppState();
{
  let interval: NodeJS.Timeout | null;
  keyringService.on('unlock', () => {
    walletController.syncMainnetChainList();

    if (interval) {
      clearInterval(interval);
    }
    const sendEvent = async () => {
      const time = preferenceService.getSendLogTime();
      if (dayjs(time).utc().isSame(dayjs().utc(), 'day')) {
        return;
      }
      const customTestnetLength = customTestnetService.getList()?.length;
      if (customTestnetLength) {
        matomoRequestEvent({
          category: 'Custom Network',
          action: 'Custom Network Status',
          value: customTestnetLength,
        });
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
    if (!session?.origin) {
      const tabInfo = await browser.tabs.get(sessionId);
      // prevent tabCheckin not triggered, re-fetch tab info when session have no info at all
      session?.setProp({
        origin,
        name: tabInfo.title || '',
        icon: tabInfo.favIconUrl || '',
      });
    }
    // for background push to respective page
    req.session!.setPortMessage(pm);

    if (subscriptionManager.methods[data?.method]) {
      const connectSite = permissionService.getConnectedSite(session!.origin);
      if (connectSite) {
        const chain =
          findChain({ enum: connectSite.chain }) || CHAINS[CHAINS_ENUM.ETH];
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
