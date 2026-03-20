import openapiService, {
  TokenItem,
  TxAllHistoryResult,
  TxHistoryResult,
} from '@/background/service/openapi';
import { db } from '..';
import { TxHistoryItemRow } from '../schema/history';
import { has, last, transform } from 'lodash';
import Dexie from 'dexie';
import { transformToHistory } from '@/utils/history';
import { syncDbService } from './syncDbService';

const USE_REALTIME_API_DURATION = 24 * 5 * 60 * 60 * 1000; // use async history api if user not opened app in 5 days

class HistoryDbService {
  async fillEntity({
    address,
    data,
  }: {
    address: string;
    data: TxAllHistoryResult | TxHistoryResult;
  }) {
    await db.history.bulkPut(
      transformToHistory({
        data,
        address,
      })
    );
  }

  async getLatestItem(address: string) {
    const lastItem = await db.history
      .where('[owner_addr+time_at]')
      .between(
        [address.toLowerCase(), Dexie.minKey],
        [address.toLowerCase(), Dexie.maxKey]
      )
      .last();
    return lastItem;
  }

  async getLatestItemTime(address: string) {
    const lastItem = await this.getLatestItem(address);
    return lastItem?.time_at;
  }

  async sync({
    address,
    startTime,
    latestTime: _latestTime,
    forceUseRealTimeApi: _forceUseRealTimeApi,
  }: {
    address: string;
    startTime?: number;
    latestTime?: number;
    forceUseRealTimeApi?: boolean;
  }) {
    const syncState = await syncDbService.getSyncState({
      address,
      scene: 'history',
    });

    const hasPendingHistorySync =
      syncState?.isSyncing &&
      syncState.pendingStartTime !== undefined &&
      syncState.pendingLatestTime !== undefined;

    if (hasPendingHistorySync) {
      const pendingStartTime = syncState.pendingStartTime!;
      const pendingLatestTime = syncState.pendingLatestTime!;

      await this.syncWithAllHistoryApi({
        address,
        startTime: pendingStartTime,
        latestTime: pendingLatestTime,
      });
    }

    const latestTime =
      _latestTime ?? (await this.getLatestItemTime(address)) ?? 0;

    const updatedAt =
      (await syncDbService.getUpdatedAt({ address, scene: 'history' })) || 0;

    const forceUseRealTimeApi =
      _forceUseRealTimeApi ??
      updatedAt > Date.now() - USE_REALTIME_API_DURATION;

    let hasNew = true;

    if (latestTime) {
      const res = await openapiService.hasNewTxFrom({
        address: address,
        startTime: latestTime,
      });
      hasNew = res.has_new_tx;
    }
    if (!hasNew) {
      await syncDbService.setUpdatedAt({
        address,
        scene: 'history',
        updatedAt: Date.now(),
      });
      return;
    }

    if (forceUseRealTimeApi) {
      await this.syncWithRealTimeApi({
        address,
        startTime: startTime || 0,
        latestTime: latestTime * 1000,
      });

      await syncDbService.setUpdatedAt({
        address,
        scene: 'history',
        updatedAt: Date.now(),
      });

      return;
    }

    await this.syncWithAllHistoryApi({
      address,
      startTime: startTime || 0,
      latestTime,
    });

    await syncDbService.setUpdatedAt({
      address,
      scene: 'history',
      updatedAt: Date.now(),
    });
  }

  async syncWithAllHistoryApi({
    address,
    startTime: _startTime,
    latestTime: _latestTime,
  }: {
    address: string;
    startTime: number;
    latestTime?: number;
  }) {
    const latestTime =
      _latestTime ?? (await this.getLatestItemTime(address)) ?? 0;
    const isExpiredTimeAgo = new Date().getTime() - 15 * 24 * 60 * 60 * 1000; // 15 days ago
    const isAddUpdate = latestTime > isExpiredTimeAgo / 1000;

    let startTime = _startTime;
    let isEnd = false;

    await syncDbService.updateSyncState({
      address,
      scene: 'history',
      patch: {
        isSyncing: true,
        pendingStartTime: startTime,
        pendingLatestTime: latestTime,
      },
    });

    while (!isEnd) {
      const res = await openapiService.getAllTxHistory({
        id: address,
        start_time: startTime || 0,
        page_count: isAddUpdate ? 500 : 2000,
      });

      const ninetyDaysAgo = new Date().getTime() / 1000 - 90 * 24 * 60 * 60; // 90 days ago
      res.history_list = res.history_list.filter(
        (i) => i.time_at > ninetyDaysAgo
      );

      console.debug('getAllTxHistory length:', res.history_list.length);
      if (!res.history_list.length) {
        isEnd = true;
        break;
      }

      const lastItemTime =
        res.history_list[res.history_list.length - 1].time_at;
      if (lastItemTime < latestTime || !isAddUpdate) {
        // update done or not all update  to interup loop
        isEnd = true;
        res.history_list = res.history_list.filter(
          (i) => i.time_at > latestTime
        );

        console.debug(
          '🔍syncUserAllHistory CUSTOM_LOGGER:=>: update',
          address,
          'add length:',
          res.history_list.length
        );
        if (res.history_list.length) {
          await this.fillEntity({
            address,
            data: res,
          });
        }
        console.debug(
          '🔍syncUserAllHistory CUSTOM_LOGGER:=>: No more history',
          address
        );
      } else {
        // need more history, exec loop
        console.debug(
          '🔍syncUserAllHistory CUSTOM_LOGGER:=>: fetch more history',
          address,
          'lastItemTime:',
          lastItemTime
        );
        console.debug(
          '🔍syncUserAllHistory CUSTOM_LOGGER:=>: loop update',
          address,
          'add length:',
          res.history_list.length
        );

        await this.fillEntity({
          address,
          data: res,
        });
        startTime = lastItemTime;
        await syncDbService.updateSyncState({
          address,
          scene: 'history',
          patch: {
            isSyncing: true,
            pendingStartTime: startTime,
            pendingLatestTime: latestTime,
          },
        });
      }
    }

    await syncDbService.updateSyncState({
      address,
      scene: 'history',
      patch: {
        isSyncing: false,
        pendingStartTime: undefined,
        pendingLatestTime: undefined,
      },
    });
  }

  async syncWithRealTimeApi({
    address,
    startTime: _startTime,
    latestTime: _latestTime,
  }: {
    address: string;
    startTime: number;
    latestTime?: number;
  }) {
    const notNeedUpdateTime = new Date().getTime() / 1000 - 30 * 24 * 60 * 60; // 30 days ago
    const latestTime = _latestTime || notNeedUpdateTime;
    const startTime = _startTime || 0;

    const PAGE_COUNT = 20;

    console.log(
      'synHistoryInRealTimeApi CUSTOM_LOGGER:=>: start',
      address,
      'latestTime:',
      latestTime,
      'startTime:',
      startTime
    );
    let nextStartTime = startTime;
    let isEnd = false;
    const ninetyDaysAgo = new Date().getTime() / 1000 - 90 * 24 * 60 * 60; // 90 days ago

    while (!isEnd) {
      const res = await openapiService.listTxHisotry({
        id: address,
        start_time: nextStartTime,
        page_count: PAGE_COUNT,
      });

      res.history_list = res.history_list.filter(
        (i) => i.time_at > ninetyDaysAgo
      );

      const lastItem = last(res.history_list);

      if (
        !lastItem ||
        lastItem.time_at * 1000 < latestTime ||
        res.history_list.length < PAGE_COUNT
      ) {
        isEnd = true;
      } else {
        nextStartTime = lastItem.time_at;
      }
      await this.fillEntity({
        address,
        data: res,
      });
    }
  }

  deleteForAddress(address: string) {
    return db.history.where('owner_addr').equalsIgnoreCase(address).delete();
  }
}

export const historyDbService = new HistoryDbService();
