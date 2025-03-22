import { isManifestV3 } from '@/utils/env';
import browser from 'webextension-polyfill';
import { createPersistStore } from '../utils';
import { ALARMS_SYNC_METAMASK_DAPPS } from '../utils/alarms';
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

    this.syncMetamaskModeList();
    this.resetTimer();
    this.localSites = permissionService.getMetamaskModeSites().map((item) => {
      return item.origin.replace(/^https?:\/\//, '');
    });
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
      browser.alarms.clear(ALARMS_SYNC_METAMASK_DAPPS);
    }

    if (isManifestV3) {
      browser.alarms.create(ALARMS_SYNC_METAMASK_DAPPS, {
        delayInMinutes: periodInMinutes,
        periodInMinutes: periodInMinutes,
      });
      browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === ALARMS_SYNC_METAMASK_DAPPS) {
          this.syncMetamaskModeList();
        }
      });
    } else {
      this.timer = setInterval(() => {
        this.syncMetamaskModeList();
      }, periodInMinutes * 60 * 1000);
    }
  };

  checkIsMetamaskMode(origin: string) {
    return !![...this.store.sites, ...this.localSites].find(
      (item) => item === origin.replace(/^https?:\/\//, '')
    );
  }
}

export const metamaskModeService = new MetamaskModeService();
