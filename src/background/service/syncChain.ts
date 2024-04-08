import { supportedChainToChain, updateChainStore } from '@/utils/chain';
import { isManifestV3 } from '@/utils/env';
import { Chain } from '@debank/common';
import browser from 'webextension-polyfill';
import { ALARMS_SYNC_CHAINS } from '../utils/alarms';
import { http } from '../utils/http';
import { SupportedChain } from './openapi';
import { openapiService } from '.';

class SyncChainService {
  timer: ReturnType<typeof setInterval> | null = null;

  syncMainnetChainList = async () => {
    try {
      const chains = process.env.DEBUG
        ? await openapiService.getSupportedChains()
        : await http
            .get('https://static.debank.com/supported_chains.json')
            .then((res) => {
              return res.data as SupportedChain[];
            });
      const list: Chain[] = chains
        .filter((item) => !item.is_disabled)
        .map((item) => {
          const chain: Chain = supportedChainToChain(item);
          return chain;
        });
      updateChainStore({
        mainnetList: list,
      });
      browser.storage.local.set({
        rabbyMainnetChainList: list,
      });
    } catch (e) {
      console.error('fetch chain list error: ', e);
    }
  };

  resetTimer = () => {
    const periodInMinutes = 60;
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
          this.syncMainnetChainList();
        }
      });
    } else {
      this.timer = setInterval(() => {
        this.syncMainnetChainList();
      }, periodInMinutes * 60 * 1000);
    }
  };
  roll = () => {
    this.resetTimer();
  };
}

export const syncChainService = new SyncChainService();
