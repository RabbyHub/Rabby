import { supportedChainToChain, updateChainStore } from '@/utils/chain';
import { isManifestV3 } from '@/utils/env';
import { Chain } from '@debank/common';
import { CHAINS, CHAINS_ENUM } from 'consts';
import browser from 'webextension-polyfill';
import { ALARMS_SYNC_CHAINS } from '../utils/alarms';
import { http } from '../utils/http';
import { SupportedChain } from './openapi';
import { openapiService, permissionService, sessionService } from '.';
import { createPersistStore } from '../utils';
import dayjs from 'dayjs';

interface SyncChainServiceStore {
  updatedAt: number;
}

class SyncChainService {
  timer: ReturnType<typeof setInterval> | null = null;
  store: SyncChainServiceStore = {
    updatedAt: 0,
  };

  init = async () => {
    const storage = await createPersistStore<SyncChainServiceStore>({
      name: 'supported_chains',
      template: {
        updatedAt: 0,
      },
    });
    this.store = storage || this.store;
    this.store.updatedAt = this.store.updatedAt || 0;
  };

  syncMainnetChainList = async (options?: { force?: boolean }) => {
    const { force = false } = options || {};
    if (
      dayjs().isBefore(dayjs(this.store.updatedAt).add(55, 'minute')) &&
      !force
    ) {
      return;
    }
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
      // ETH is the fallback chain everywhere, a list without it is broken
      if (!list.some((item) => item.enum === CHAINS_ENUM.ETH)) {
        throw new Error('invalid mainnet chain list');
      }
      updateChainStore({
        mainnetList: list,
      });
      browser.storage.local.set({
        rabbyMainnetChainList: list,
      });
      this.store.updatedAt = Date.now();
      this.disconnectSitesWithUnsupportedChain();
    } catch (e) {
      console.error('fetch chain list error: ', e);
    }
  };

  /**
   * Disconnect the dapps whose chain was removed from the chain list. They are
   * told directly, as the permission check already filters them out of
   * broadcasts.
   */
  disconnectSitesWithUnsupportedChain = () => {
    const ethChain = CHAINS[CHAINS_ENUM.ETH];
    permissionService
      .resetSitesWithUnsupportedChain()
      .filter((site) => site.isConnected)
      .forEach((site) => {
        sessionService.broadcastEvent('accountsChanged', [], site.origin, true);
        sessionService.broadcastEvent(
          'chainChanged',
          {
            chain: ethChain.hex,
            networkVersion: ethChain.network,
          },
          site.origin,
          true
        );
      });
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
