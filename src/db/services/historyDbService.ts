import type { OpenApiService } from '@rabby-wallet/rabby-api';
import type { TxAllHistoryResult, TxHistoryResult } from '@/services/openapi';
import { db } from '..';
import { last } from 'lodash';
import Dexie from 'dexie';
import { transformToHistory } from '@/utils/history';
import { syncDbService } from './syncDbService';
import {
  HISTORY_RETENTION_SECONDS,
  HISTORY_TX_COUNT_CHECK_INTERVAL,
  HISTORY_TX_COUNT_SYNC_SCENE,
  HISTORY_TX_COUNT_WINDOW_SECONDS,
} from '../constants';

const USE_REALTIME_API_DURATION = 24 * 5 * 60 * 60 * 1000; // use async history api if user not opened app in 5 days

export type HistoryOpenapi = Pick<
  OpenApiService,
  'hasNewTxFrom' | 'getAllTxHistory' | 'listTxHistory' | 'getTxCount'
>;

export const getHistoryRetentionStart = () =>
  Date.now() / 1000 - HISTORY_RETENTION_SECONDS;

const localSyncLocks = new Map<string, Promise<unknown>>();

// Popup, desktop and notification pages share one IndexedDB, so a sync in one
// page can otherwise resume the same pending range as another, or read its
// half-written pages as the latest synced time. Web Locks serialize across
// pages and are released when a page closes; the in-memory chain only covers
// environments without them.
const withHistorySyncLock = <T>(
  address: string,
  task: () => Promise<T>
): Promise<T> => {
  const name = `rabby-history-sync:${address.toLowerCase()}`;
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request(name, task) as Promise<T>;
  }

  const previous = localSyncLocks.get(name) || Promise.resolve();
  const current = previous.then(task);
  const settled = current.catch(() => undefined);
  localSyncLocks.set(name, settled);
  settled.then(() => {
    if (localSyncLocks.get(name) === settled) {
      localSyncLocks.delete(name);
    }
  });
  return current;
};

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

  sync(params: { openapi: HistoryOpenapi; address: string }) {
    return withHistorySyncLock(params.address, async () => {
      await this.syncWithinLock(params);
      await this.deleteExpired(params.address);
      await this.reconcileRecentTxCount(params);
    });
  }

  countInTimeRange(address: string, fromTs: number, toTs: number) {
    const owner = address.toLowerCase();
    return db.history
      .where('[owner_addr+time_at]')
      .between([owner, fromTs], [owner, toTs], true, true)
      .count();
  }

  // Incremental sync only looks past the newest stored item, so a tx indexed
  // late, or behind a newer one, is never fetched. A daily count check over
  // the last day catches those and refetches the day.
  async reconcileRecentTxCount({
    openapi,
    address,
  }: {
    openapi: HistoryOpenapi;
    address: string;
  }) {
    const lastCheckedAt =
      (await syncDbService.getUpdatedAt({
        address,
        scene: HISTORY_TX_COUNT_SYNC_SCENE,
      })) || 0;
    if (Date.now() - lastCheckedAt < HISTORY_TX_COUNT_CHECK_INTERVAL) {
      return;
    }
    // Record the attempt before calling, so a failing endpoint costs one
    // request a day instead of one on every open.
    await syncDbService.setUpdatedAt({
      address,
      scene: HISTORY_TX_COUNT_SYNC_SCENE,
      updatedAt: Date.now(),
    });

    const toTs = Math.floor(Date.now() / 1000);
    const fromTs = toTs - HISTORY_TX_COUNT_WINDOW_SECONDS;
    const { tx_count } = await openapi.getTxCount({
      id: address,
      from_ts: fromTs,
      to_ts: toTs,
    });
    const localCount = await this.countInTimeRange(address, fromTs, toTs);
    if (localCount >= tx_count) {
      return;
    }

    await this.syncWithRealTimeApi({
      openapi,
      address,
      startTime: 0,
      latestTime: fromTs * 1000,
    });
  }

  queryRecent({
    address,
    isFilterScam,
    serverChainId,
    limit,
  }: {
    address: string;
    isFilterScam?: boolean;
    serverChainId?: string;
    limit?: number;
  }) {
    const owner = address.toLowerCase();
    const collection = db.history
      .where('[owner_addr+time_at]')
      .between([owner, getHistoryRetentionStart()], [owner, Dexie.maxKey])
      .reverse()
      .and((item) => {
        if (isFilterScam && (item.is_scam || item.is_small_tx)) {
          return false;
        }
        return !serverChainId || item.chain === serverChainId;
      });
    // The index already yields newest first, so a limit reads only the rows
    // shown; limit() counts rows that pass the filter above.
    return (limit ? collection.limit(limit) : collection).toArray();
  }

  async deleteExpired(address: string) {
    const owner = address.toLowerCase();
    const latestTime = await this.getLatestItemTime(owner);
    if (latestTime === undefined) {
      return 0;
    }
    // Keep the newest second even when it has expired: it is the sync
    // watermark, and without it every open would sync the address as new.
    const cutoff = Math.min(getHistoryRetentionStart(), latestTime);
    return db.history
      .where('[owner_addr+time_at]')
      .between([owner, Dexie.minKey], [owner, cutoff])
      .delete();
  }

  private async syncWithinLock({
    openapi,
    address,
  }: {
    openapi: HistoryOpenapi;
    address: string;
  }) {
    const syncState = await syncDbService.getSyncState({
      address,
      scene: 'history',
    });

    // Holding the lock, isSyncing can only be left over from a sync that was
    // interrupted, so finish its range before trusting the latest stored item.
    const hasPendingHistorySync =
      syncState?.isSyncing &&
      syncState.pendingStartTime !== undefined &&
      syncState.pendingLatestTime !== undefined;

    if (hasPendingHistorySync) {
      const pendingStartTime = syncState.pendingStartTime!;
      const pendingLatestTime = syncState.pendingLatestTime!;

      if (syncState.pendingApi === 'realtime') {
        await this.syncWithRealTimeApi({
          openapi,
          address,
          startTime: pendingStartTime,
          latestTime: pendingLatestTime,
        });
      } else {
        await this.syncWithAllHistoryApi({
          openapi,
          address,
          startTime: pendingStartTime,
          latestTime: pendingLatestTime,
        });
      }
    }

    const latestTime = (await this.getLatestItemTime(address)) ?? 0;

    const updatedAt =
      (await syncDbService.getUpdatedAt({ address, scene: 'history' })) || 0;

    const useRealTimeApi = updatedAt > Date.now() - USE_REALTIME_API_DURATION;

    let hasNew = true;

    if (latestTime) {
      const res = await openapi.hasNewTxFrom({
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

    if (useRealTimeApi) {
      await this.syncWithRealTimeApi({
        openapi,
        address,
        startTime: 0,
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
      openapi,
      address,
      startTime: 0,
      latestTime,
    });

    await syncDbService.setUpdatedAt({
      address,
      scene: 'history',
      updatedAt: Date.now(),
    });
  }

  async syncWithAllHistoryApi({
    openapi,
    address,
    startTime: _startTime,
    latestTime: _latestTime,
  }: {
    openapi: HistoryOpenapi;
    address: string;
    startTime: number;
    latestTime?: number;
  }) {
    const latestTime =
      _latestTime ?? (await this.getLatestItemTime(address)) ?? 0;
    const isExpiredTimeAgo = new Date().getTime() - 15 * 24 * 60 * 60 * 1000; // 15 days ago
    const isAddUpdate = latestTime > isExpiredTimeAgo / 1000;

    let startTime = _startTime;

    await syncDbService.updateSyncState({
      address,
      scene: 'history',
      patch: {
        isSyncing: true,
        pendingApi: 'all',
        pendingStartTime: startTime,
        pendingLatestTime: latestTime,
      },
    });

    const pageCount = isAddUpdate ? 500 : 2000;
    const ninetyDaysAgo = getHistoryRetentionStart();

    // Keep paging until the range meets what is already stored. Stopping
    // earlier would leave a hole below the pages just written that no later
    // sync can see, since they only fetch items newer than the latest one.
    let isEnd = false;
    while (!isEnd) {
      const res = await openapi.getAllTxHistory({
        id: address,
        start_time: startTime || 0,
        page_count: pageCount,
      });

      console.debug(
        '🔍syncUserAllHistory CUSTOM_LOGGER:=>: page',
        address,
        'startTime:',
        startTime,
        'length:',
        res.history_list.length
      );
      if (!res.history_list.length) {
        break;
      }

      const pageLength = res.history_list.length;
      const lastItemTime = last(res.history_list)!.time_at;
      const reachedLatest = lastItemTime < latestTime;
      if (reachedLatest) {
        // Keep the latest stored second: other txs from the same block may
        // not have been indexed when it was stored. Rewriting the stored
        // ones is harmless since rows are keyed by id.
        res.history_list = res.history_list.filter(
          (i) => i.time_at >= latestTime
        );
      }
      if (res.history_list.length) {
        await this.fillEntity({
          address,
          data: res,
        });
      }

      const reachedNinetyDays = lastItemTime < ninetyDaysAgo;
      const isLastPage = pageLength < pageCount;
      // Paging is by timestamp, so a full page within one second would
      // request the same page again forever.
      const isStuck = !!startTime && lastItemTime >= startTime;
      isEnd = reachedLatest || reachedNinetyDays || isLastPage || isStuck;
      if (!isEnd) {
        startTime = lastItemTime;
        await syncDbService.updateSyncState({
          address,
          scene: 'history',
          patch: {
            isSyncing: true,
            pendingApi: 'all',
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
        pendingApi: undefined,
        pendingStartTime: undefined,
        pendingLatestTime: undefined,
      },
    });
  }

  async syncWithRealTimeApi({
    openapi,
    address,
    startTime: _startTime,
    latestTime: _latestTime,
  }: {
    openapi: HistoryOpenapi;
    address: string;
    startTime: number;
    latestTime?: number;
  }) {
    const notNeedUpdateTime = new Date().getTime() / 1000 - 30 * 24 * 60 * 60; // 30 days ago
    const latestTime = _latestTime || notNeedUpdateTime;
    const startTime = _startTime || 0;

    const PAGE_COUNT = 20;

    let nextStartTime = startTime;
    let isEnd = false;
    const ninetyDaysAgo = getHistoryRetentionStart();

    // Pages are written newest first, so the first page already moves the
    // latest stored item past the older pages still to fetch. Persist the
    // cursor before each write so an interrupted sync resumes here instead
    // of treating the gap as synced.
    const savePendingCursor = (pendingStartTime: number) =>
      syncDbService.updateSyncState({
        address,
        scene: 'history',
        patch: {
          isSyncing: true,
          pendingApi: 'realtime',
          pendingStartTime,
          pendingLatestTime: latestTime,
        },
      });

    await savePendingCursor(nextStartTime);

    while (!isEnd) {
      const res = await openapi.listTxHistory({
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
        res.history_list.length < PAGE_COUNT ||
        // Paging is by timestamp, so a full page within one second would
        // request the same page again forever.
        (!!nextStartTime && lastItem.time_at >= nextStartTime)
      ) {
        isEnd = true;
      }
      await this.fillEntity({
        address,
        data: res,
      });
      if (!isEnd) {
        nextStartTime = lastItem!.time_at;
        await savePendingCursor(nextStartTime);
      }
    }

    await syncDbService.updateSyncState({
      address,
      scene: 'history',
      patch: {
        isSyncing: false,
        pendingApi: undefined,
        pendingStartTime: undefined,
        pendingLatestTime: undefined,
      },
    });
  }

  deleteForAddress(address: string) {
    return db.history.where('owner_addr').equalsIgnoreCase(address).delete();
  }
}

export const historyDbService = new HistoryDbService();
