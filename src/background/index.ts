import eventBus from '@/eventBus';
import migrateData from '@/migrations';
import { getOriginFromUrl, transformFunctionsToZero } from '@/utils';
import { appIsDev, getSentryEnv } from '@/utils/env';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { Message, sendReadyMessageToTabs } from '@/utils/message';
import Safe from '@rabby-wallet/gnosis-sdk';
import * as Sentry from '@sentry/browser';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { WalletController } from 'background/controller/wallet';
import {
  EVENTS,
  EVENTS_IN_BG,
  IS_FIREFOX,
  KEYRING_CATEGORY_MAP,
  KEYRING_TYPE,
} from 'consts';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ethErrors } from 'eth-rpc-errors';
import { groupBy, isNull } from 'lodash';
import 'reflect-metadata';
import browser from 'webextension-polyfill';
import { providerController, walletController } from './controller';
import createSubscription from './controller/provider/subscriptionManager';
import {
  bridgeService,
  contactBookService,
  gasAccountService,
  HDKeyRingLastAddAddrTimeService,
  keyringService,
  openapiService,
  pageStateCacheService,
  permissionService,
  preferenceService,
  RabbyPointsService,
  RPCService,
  securityEngineService,
  sessionService,
  signTextHistoryService,
  swapService,
  transactionBroadcastWatchService,
  transactionHistoryService,
  transactionWatchService,
  uninstalledService,
  whitelistService,
} from './service';
import { customTestnetService } from './service/customTestnet';
import { GasAccountServiceStore } from './service/gasAccount';
import { testnetOpenapiService } from './service/openapi';
import { syncChainService } from './service/syncChain';
import { userGuideService } from './service/userGuide';
import { isSameAddress } from './utils';
import rpcCache from './utils/rpcCache';
import { storage } from './webapi';
import { metamaskModeService } from './service/metamaskModeService';
import { ga4 } from '@/utils/ga4';
import { ALARMS_USER_ENABLE } from './utils/alarms';

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
  await onInstall();
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
  await bridgeService.init();
  await gasAccountService.init();
  await uninstalledService.init();
  await metamaskModeService.init();

  await walletController.tryUnlock();

  rpcCache.start();

  appStoreLoaded = true;

  syncChainService.roll();
  transactionWatchService.roll();
  transactionBroadcastWatchService.roll();
  walletController.syncMainnetChainList();

  // check if user has enabled the extension
  chrome.alarms.create(ALARMS_USER_ENABLE, {
    when: Date.now(),
    periodInMinutes: 60,
  });

  if (!keyringService.isBooted()) {
    userGuideService.init();
  }

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
  await sendReadyMessageToTabs();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getBackgroundReady') {
      sendResponse({
        data: {
          ready: true,
        },
      });
    }
  });

  uninstalledService.setUninstalled();
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

        ga4.fireEvent('Has Custom Network', {
          event_category: 'Custom Network',
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

        ga4.fireEvent(`${group[0].category}_${group[0].label}`, {
          event_category: 'UserAddress',
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

  keyringService.on(
    'removedAccount',
    async (address: string, type: string, brand?: string) => {
      if (type !== KEYRING_TYPE.WatchAddressKeyring) {
        const restAddresses = await keyringService.getAllAdresses();
        const gasAccount = gasAccountService.getGasAccountData() as GasAccountServiceStore;
        if (!gasAccount?.account?.address) return;
        // check if there is another type address in wallet
        const stillHasAddr = restAddresses.some((item) => {
          return (
            isSameAddress(item.address, gasAccount.account!.address) &&
            item.type !== KEYRING_TYPE.WatchAddressKeyring
          );
        });
        if (
          !stillHasAddr &&
          isSameAddress(address, gasAccount.account.address)
        ) {
          // if there is no another type address then reset signature
          gasAccountService.setGasAccountSig();
          eventBus.emit(EVENTS.broadcastToUI, {
            method: EVENTS.GAS_ACCOUNT.LOG_OUT,
          });
        }
      }
    }
  );
}

keyringService.on('resetPassword', async () => {
  const gasAccount = gasAccountService.getGasAccountData() as GasAccountServiceStore;

  if (
    gasAccount?.account?.type === KEYRING_TYPE.SimpleKeyring ||
    gasAccount?.account?.type === KEYRING_TYPE.HdKeyring
  ) {
    gasAccountService.setGasAccountSig();
    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.GAS_ACCOUNT.LOG_OUT,
    });
  }
});

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
              const res = walletController[data.method].apply(
                null,
                data.params
              );
              if (!IS_FIREFOX) {
                return res;
              }
              if (typeof res?.then === 'function') {
                return res.then((x) => {
                  if (typeof x !== 'object' || isNull(x)) {
                    return x;
                  }
                  return transformFunctionsToZero(x);
                });
              }
              if (typeof res !== 'object' || isNull(res)) {
                return res;
              }
              return transformFunctionsToZero(res);
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

    browser.runtime.sendMessage({
      type: 'pageOpened',
    });
    eventBus.addEventListener(EVENTS.broadcastToUI, boardcastCallback);
    port.onDisconnect.addListener(() => {
      browser.runtime.sendMessage({
        type: 'pageClosed',
      });
      eventBus.removeEventListener(EVENTS.broadcastToUI, boardcastCallback);
    });

    return;
  }

  if (!port.sender?.tab) {
    return;
  }

  const pm = new PortMessage(port);
  const subscriptionManager = createSubscription(origin);

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

    if (
      subscriptionManager.methods[data?.method] &&
      permissionService.getConnectedSite(session!.origin)?.isConnected
    ) {
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

  ga4.fireEvent('User_Enable', {
    event_category: 'User Enable',
  });
  preferenceService.updateSendEnableTime(Date.now());
}

// On first install, open a new tab with Rabby
async function onInstall() {
  const storeAlreadyExisted = await userGuideService.isStorageExisted();
  // If the store doesn't exist, then this is the first time running this script,
  // and is therefore an install
  if (!storeAlreadyExisted) {
    await userGuideService.openUserGuide();
  }
}

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARMS_USER_ENABLE) {
    startEnableUser();
  }
});
