import { isManifestV3 } from '@/utils/env';
import browser from 'webextension-polyfill';
import { createPersistStore } from '../utils';
import { ALARMS_SYNC_CHAINS } from '../utils/alarms';
import { http } from '../utils/http';
import permissionService from './permission';

interface MetamaskModeServiceStore {
  sites: string[];
}
class MetamaskModeService {
  timer: ReturnType<typeof setInterval> | null = null;

  store: MetamaskModeServiceStore = {
    sites: [],
  };

  localSites: string[] = [];

  init = async () => {
    const storageCache = await createPersistStore<MetamaskModeServiceStore>({
      name: 'metamaskMode',
      template: {
        sites: [],
      },
    });
    this.store = storageCache || this.store;

    this.resetTimer();
    this.localSites = permissionService.getMetamaskModeSites().map((item) => {
      return item.origin.replace(/^https?:\/\//, '');
    });

    this.registerEvent();
  };

  syncMetamaskModeList = async () => {
    try {
      const sites = await http
        .get('https://static.debank.com/fake_mm_dapps.json')
        .then((res) => {
          return res.data as string[];
        });
      this.store.sites = sites;
    } catch (e) {
      console.error('fetch metamask list error: ', e);
    }
  };

  resetTimer = () => {
    const periodInMinutes = 30;
    if (this.timer) {
      clearInterval(this.timer);
    } else if (isManifestV3) {
      browser.alarms.clear(ALARMS_SYNC_CHAINS);
    }

    if (isManifestV3) {
      browser.alarms.create(ALARMS_SYNC_CHAINS, {
        delayInMinutes: periodInMinutes,
        periodInMinutes: periodInMinutes,
      });
      browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === ALARMS_SYNC_CHAINS) {
          this.syncMetamaskModeList();
        }
      });
    } else {
      this.timer = setInterval(() => {
        this.syncMetamaskModeList();
      }, periodInMinutes * 60 * 1000);
    }
  };

  defineMetamaskMode = () => {
    (function () {
      console.log('inject by executeScript');
      (window as any).__rabby__inject__ = {
        isMetamaskMode: true,
      };
      if ((window as any).rabbyWalletRouter) {
        (window as any).rabbyWalletRouter.rabbyProvider.isMetaMask = true;
        delete (window as any).rabbyWalletRouter.rabbyProvider.isRabby;
        (window as any).rabbyWalletRouter.rabbyEthereumProvider.isMetaMask = true;
        delete (window as any).rabbyWalletRouter.rabbyEthereumProvider.isRabby;
        window.dispatchEvent(new Event('eip6963:requestProvider'));
      }
    })();
  };

  handleInject = (tabId: number) => {
    const sites = new Set([...this.store.sites, ...this.localSites]);
    browser.tabs.get(tabId).then((tab) => {
      if (tab.url?.startsWith('http') && sites.has(new URL(tab.url).hostname))
        browser.scripting.executeScript({
          target: {
            tabId,
          },
          func: this.defineMetamaskMode,
          injectImmediately: true,
          // Inject as soon as possible
          // todo ts
          world: 'MAIN' as any,
        });
    });
  };
  registerEvent = () => {
    browser.tabs.onCreated.addListener((tab) => {
      tab.id && this.handleInject(tab.id);
    });
    browser.tabs.onActivated.addListener((tab) => {
      this.handleInject(tab.tabId);
    });
    browser.tabs.onReplaced.addListener((tabId) => {
      this.handleInject(tabId);
    });
    browser.tabs.onUpdated.addListener((tabId) => {
      this.handleInject(tabId);
    });
  };
}

export const metamaskModeService = new MetamaskModeService();
