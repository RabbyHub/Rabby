import { isManifestV3 } from '@/utils/env';
import browser from 'webextension-polyfill';
import { createPersistStore } from '../utils';
import { ALARMS_SYNC_METAMASK_DAPPS } from '../utils/alarms';
import { http } from '../utils/http';
import permissionService from './permission';
import dayjs from 'dayjs';

interface MetamaskModeServiceStore {
  sites: string[];
  updatedAt: number;
}
class MetamaskModeService {
  timer: ReturnType<typeof setInterval> | null = null;

  store: MetamaskModeServiceStore = {
    sites: [],
    updatedAt: 0,
  };

  localSites: string[] = [];

  init = async () => {
    const storageCache = await createPersistStore<MetamaskModeServiceStore>({
      name: 'metamaskMode',
      template: {
        sites: [],
        updatedAt: 0,
      },
    });
    this.store = storageCache || this.store;
    this.store.updatedAt = this.store.updatedAt || 0;

    this.syncMetamaskModeList();
    this.resetTimer();
    this.localSites = permissionService.getMetamaskModeSites().map((item) => {
      return item.origin.replace(/^https?:\/\//, '');
    });
  };

  syncMetamaskModeList = async () => {
    if (dayjs().isBefore(dayjs(this.store.updatedAt || 0).add(30, 'minute'))) {
      return [];
    }
    try {
      const sites = await http
        .get('https://static.debank.com/fake_mm_dapps.json')
        .then((res) => {
          return res.data as string[];
        });
      this.store.sites = sites;
      this.store.updatedAt = Date.now();
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
