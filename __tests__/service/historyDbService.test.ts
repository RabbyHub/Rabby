const mockSyncDbService = {
  getSyncState: jest.fn(),
  getUpdatedAt: jest.fn(),
  setUpdatedAt: jest.fn(),
  updateSyncState: jest.fn(),
};

const mockHistoryCollection = {
  reverse: jest.fn(),
  and: jest.fn(),
  limit: jest.fn(),
  toArray: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};
const mockHistoryWhereClause = {
  between: jest.fn(),
};
const mockHistoryTable = {
  where: jest.fn(),
};

jest.mock('@/db', () => ({
  db: {
    history: mockHistoryTable,
  },
}));

jest.mock('@/db/services/syncDbService', () => ({
  syncDbService: mockSyncDbService,
}));

jest.mock('@/utils/history', () => ({
  transformToHistory: jest.fn(),
}));

import { historyDbService } from '@/db/services/historyDbService';
import type { HistoryOpenapi } from '@/db/services/historyDbService';
import {
  HISTORY_RETENTION_SECONDS,
  HISTORY_TX_COUNT_CHECK_INTERVAL,
  HISTORY_TX_COUNT_SYNC_SCENE,
  HISTORY_TX_COUNT_WINDOW_SECONDS,
} from '@/db/constants';
import Dexie from 'dexie';
import { last } from 'lodash';

beforeEach(() => {
  mockHistoryTable.where.mockReturnValue(mockHistoryWhereClause);
  mockHistoryWhereClause.between.mockReturnValue(mockHistoryCollection);
  mockHistoryCollection.reverse.mockReturnValue(mockHistoryCollection);
  mockHistoryCollection.and.mockReturnValue(mockHistoryCollection);
  mockHistoryCollection.limit.mockReturnValue(mockHistoryCollection);
  mockHistoryCollection.toArray.mockResolvedValue([]);
  mockHistoryCollection.delete.mockResolvedValue(0);
  mockHistoryCollection.count.mockResolvedValue(0);
});

const ADDRESS = '0x0000000000000000000000000000000000000001';
const LATEST_TIME = 2_000_000;

const createOpenapi = (hasNew: boolean) => {
  const openapi = {
    hasNewTxFrom: jest.fn().mockResolvedValue({
      has_new_tx: hasNew,
    }),
    getAllTxHistory: jest.fn(),
    getTxCount: jest.fn().mockResolvedValue({ tx_count: 0, has_more: false }),
    listTxHistory: jest.fn(),
  };

  return (openapi as unknown) as jest.Mocked<HistoryOpenapi>;
};

describe('historyDbService sync routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncDbService.getSyncState.mockResolvedValue(undefined);
    mockSyncDbService.getUpdatedAt.mockResolvedValue(Date.now());
    mockSyncDbService.setUpdatedAt.mockResolvedValue(undefined);
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(LATEST_TIME);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not call a sync API when hasNewTxFrom returns false', async () => {
    const openapi = createOpenapi(false);
    const syncWithRealTimeApi = jest
      .spyOn(historyDbService, 'syncWithRealTimeApi')
      .mockResolvedValue(undefined);
    const syncWithAllHistoryApi = jest
      .spyOn(historyDbService, 'syncWithAllHistoryApi')
      .mockResolvedValue(undefined);

    await historyDbService.sync({
      openapi,
      address: ADDRESS,
    });

    expect(openapi.hasNewTxFrom).toHaveBeenCalledWith({
      address: ADDRESS,
      startTime: LATEST_TIME,
    });
    expect(syncWithRealTimeApi).not.toHaveBeenCalled();
    expect(syncWithAllHistoryApi).not.toHaveBeenCalled();
    expect(mockSyncDbService.setUpdatedAt).toHaveBeenCalledTimes(1);
  });

  test('checks hasNewTxFrom before using the realtime API', async () => {
    const openapi = createOpenapi(true);
    const syncWithRealTimeApi = jest
      .spyOn(historyDbService, 'syncWithRealTimeApi')
      .mockResolvedValue(undefined);
    const syncWithAllHistoryApi = jest
      .spyOn(historyDbService, 'syncWithAllHistoryApi')
      .mockResolvedValue(undefined);

    await historyDbService.sync({
      openapi,
      address: ADDRESS,
    });

    expect(openapi.hasNewTxFrom).toHaveBeenCalledTimes(1);
    expect(syncWithRealTimeApi).toHaveBeenCalledWith({
      openapi,
      address: ADDRESS,
      startTime: 0,
      latestTime: LATEST_TIME * 1000,
    });
    expect(syncWithAllHistoryApi).not.toHaveBeenCalled();
    expect(openapi.hasNewTxFrom.mock.invocationCallOrder[0]).toBeLessThan(
      syncWithRealTimeApi.mock.invocationCallOrder[0]
    );
  });

  test('uses only the full API after a stale sync', async () => {
    mockSyncDbService.getUpdatedAt.mockResolvedValue(0);
    const openapi = createOpenapi(true);
    const syncWithRealTimeApi = jest
      .spyOn(historyDbService, 'syncWithRealTimeApi')
      .mockResolvedValue(undefined);
    const syncWithAllHistoryApi = jest
      .spyOn(historyDbService, 'syncWithAllHistoryApi')
      .mockResolvedValue(undefined);

    await historyDbService.sync({
      openapi,
      address: ADDRESS,
    });

    expect(openapi.hasNewTxFrom).toHaveBeenCalledTimes(1);
    expect(syncWithAllHistoryApi).toHaveBeenCalledTimes(1);
    expect(syncWithRealTimeApi).not.toHaveBeenCalled();
  });
});

const nowInSeconds = () => Math.floor(Date.now() / 1000);

const createHistoryPage = (times: number[]) => ({
  history_list: times.map((time_at, index) => ({
    id: `0x${time_at.toString(16)}${index}`,
    chain: 'eth',
    time_at,
  })),
});

const createDeferred = <T = void>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('historyDbService realtime sync resume', () => {
  let syncState: Record<string, unknown> | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    syncState = undefined;
    mockSyncDbService.getSyncState.mockImplementation(async () => syncState);
    mockSyncDbService.updateSyncState.mockImplementation(
      async ({ patch }: { patch: Record<string, unknown> }) => {
        syncState = { ...syncState, ...patch };
      }
    );
    mockSyncDbService.getUpdatedAt.mockResolvedValue(Date.now());
    mockSyncDbService.setUpdatedAt.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('resumes an interrupted realtime sync from the last written page', async () => {
    const localLatestTime = nowInSeconds() - 24 * 60 * 60;
    const firstPageTimes = Array.from(
      { length: 20 },
      (_, i) => nowInSeconds() - 60 * (i + 1)
    );
    const firstPageLastTime = firstPageTimes[firstPageTimes.length - 1];
    const secondPageTimes = [firstPageLastTime - 60, firstPageLastTime - 120];

    const fillEntity = jest
      .spyOn(historyDbService, 'fillEntity')
      .mockResolvedValue(undefined);
    const getLatestItemTime = jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(localLatestTime);

    const openapi = createOpenapi(true);
    openapi.listTxHistory
      .mockResolvedValueOnce(createHistoryPage(firstPageTimes) as any)
      .mockRejectedValueOnce(new Error('popup closed'));

    await expect(
      historyDbService.sync({ openapi, address: ADDRESS })
    ).rejects.toThrow('popup closed');

    expect(fillEntity).toHaveBeenCalledTimes(1);
    expect(syncState).toMatchObject({
      isSyncing: true,
      pendingApi: 'realtime',
      pendingStartTime: firstPageLastTime,
      pendingLatestTime: localLatestTime * 1000,
    });

    // The first page is stored now, so the newest local item no longer
    // reveals the missing range; only the saved cursor does.
    getLatestItemTime.mockResolvedValue(firstPageTimes[0]);
    openapi.hasNewTxFrom.mockResolvedValue({ has_new_tx: false });
    openapi.listTxHistory.mockResolvedValueOnce(
      createHistoryPage(secondPageTimes) as any
    );

    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(openapi.listTxHistory).toHaveBeenLastCalledWith({
      id: ADDRESS,
      start_time: firstPageLastTime,
      page_count: 20,
    });
    expect(fillEntity).toHaveBeenLastCalledWith({
      address: ADDRESS,
      data: expect.objectContaining({
        history_list: expect.arrayContaining([
          expect.objectContaining({ time_at: secondPageTimes[0] }),
          expect.objectContaining({ time_at: secondPageTimes[1] }),
        ]),
      }),
    });
    expect(syncState).toMatchObject({
      isSyncing: false,
      pendingApi: undefined,
      pendingStartTime: undefined,
      pendingLatestTime: undefined,
    });
  });

  test('saves the cursor before the first page is written', async () => {
    const localLatestTime = nowInSeconds() - 60 * 60;
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(localLatestTime);
    jest.spyOn(historyDbService, 'fillEntity').mockImplementation(async () => {
      expect(syncState).toMatchObject({
        isSyncing: true,
        pendingApi: 'realtime',
        pendingStartTime: 0,
      });
    });

    const openapi = createOpenapi(true);
    openapi.listTxHistory.mockResolvedValueOnce(
      createHistoryPage([nowInSeconds() - 60]) as any
    );

    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(historyDbService.fillEntity).toHaveBeenCalledTimes(1);
    expect(syncState).toMatchObject({ isSyncing: false });
  });

  test('stops when a full realtime page cannot move the time cursor', async () => {
    const stuckTime = nowInSeconds() - 60;
    const openapi = createOpenapi(true);
    openapi.listTxHistory.mockResolvedValue(
      createHistoryPage(Array(20).fill(stuckTime)) as any
    );
    jest.spyOn(historyDbService, 'fillEntity').mockResolvedValue(undefined);

    await historyDbService.syncWithRealTimeApi({
      openapi,
      address: ADDRESS,
      startTime: stuckTime,
      latestTime: (nowInSeconds() - 24 * 60 * 60) * 1000,
    });

    expect(openapi.listTxHistory).toHaveBeenCalledTimes(1);
    expect(syncState).toMatchObject({ isSyncing: false });
  });

  test('resumes pending state without pendingApi through the all-history API', async () => {
    syncState = {
      isSyncing: true,
      pendingStartTime: 1_000,
      pendingLatestTime: 500,
    };
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(LATEST_TIME);
    const syncWithAllHistoryApi = jest
      .spyOn(historyDbService, 'syncWithAllHistoryApi')
      .mockResolvedValue(undefined);
    const syncWithRealTimeApi = jest
      .spyOn(historyDbService, 'syncWithRealTimeApi')
      .mockResolvedValue(undefined);

    await historyDbService.sync({
      openapi: createOpenapi(false),
      address: ADDRESS,
    });

    expect(syncWithAllHistoryApi).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: 1_000, latestTime: 500 })
    );
    expect(syncWithRealTimeApi).not.toHaveBeenCalled();
  });
});

describe('historyDbService sync lock', () => {
  const OTHER_ADDRESS = '0x0000000000000000000000000000000000000002';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncDbService.getSyncState.mockResolvedValue(undefined);
    mockSyncDbService.getUpdatedAt.mockResolvedValue(Date.now());
    mockSyncDbService.setUpdatedAt.mockResolvedValue(undefined);
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(LATEST_TIME);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not start a second sync for an address until the first finishes', async () => {
    const firstCheck = createDeferred<{ has_new_tx: boolean }>();
    const openapi = createOpenapi(false);
    openapi.hasNewTxFrom
      .mockReturnValueOnce(firstCheck.promise)
      .mockResolvedValueOnce({ has_new_tx: false });

    const first = historyDbService.sync({ openapi, address: ADDRESS });
    const second = historyDbService.sync({
      openapi,
      address: ADDRESS.toUpperCase().replace('0X', '0x'),
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(mockSyncDbService.getSyncState).toHaveBeenCalledTimes(1);
    expect(openapi.hasNewTxFrom).toHaveBeenCalledTimes(1);

    firstCheck.resolve({ has_new_tx: false });
    await Promise.all([first, second]);

    expect(mockSyncDbService.getSyncState).toHaveBeenCalledTimes(2);
    expect(openapi.hasNewTxFrom).toHaveBeenCalledTimes(2);
  });

  test('does not block syncs for other addresses', async () => {
    const firstCheck = createDeferred<{ has_new_tx: boolean }>();
    const openapi = createOpenapi(false);
    openapi.hasNewTxFrom
      .mockReturnValueOnce(firstCheck.promise)
      .mockResolvedValueOnce({ has_new_tx: false });

    const first = historyDbService.sync({ openapi, address: ADDRESS });
    await historyDbService.sync({ openapi, address: OTHER_ADDRESS });

    expect(openapi.hasNewTxFrom).toHaveBeenLastCalledWith({
      address: OTHER_ADDRESS,
      startTime: LATEST_TIME,
    });

    firstCheck.resolve({ has_new_tx: false });
    await first;
  });

  test('releases the lock when a sync fails', async () => {
    const openapi = createOpenapi(false);
    openapi.hasNewTxFrom
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ has_new_tx: false });

    await expect(
      historyDbService.sync({ openapi, address: ADDRESS })
    ).rejects.toThrow('network');
    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(openapi.hasNewTxFrom).toHaveBeenCalledTimes(2);
    expect(mockSyncDbService.setUpdatedAt).toHaveBeenCalledTimes(1);
  });

  test('uses Web Locks keyed by the lowercased address when available', async () => {
    const request = jest.fn((_name: string, task: () => Promise<unknown>) =>
      task()
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request },
      configurable: true,
    });

    try {
      await historyDbService.sync({
        openapi: createOpenapi(false),
        address: '0x00000000000000000000000000000000000000AB',
      });
    } finally {
      delete (navigator as any).locks;
    }

    expect(request).toHaveBeenCalledWith(
      'rabby-history-sync:0x00000000000000000000000000000000000000ab',
      expect.any(Function)
    );
    expect(mockSyncDbService.setUpdatedAt).toHaveBeenCalledTimes(1);
  });
});

describe('historyDbService all-history pagination', () => {
  const DAY = 24 * 60 * 60;
  let syncState: Record<string, unknown> | undefined;

  const descendingTimes = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => from - i);

  beforeEach(() => {
    jest.clearAllMocks();
    syncState = undefined;
    mockSyncDbService.getSyncState.mockImplementation(async () => syncState);
    mockSyncDbService.updateSyncState.mockImplementation(
      async ({ patch }: { patch: Record<string, unknown> }) => {
        syncState = { ...syncState, ...patch };
      }
    );
    mockSyncDbService.getUpdatedAt.mockResolvedValue(0);
    mockSyncDbService.setUpdatedAt.mockResolvedValue(undefined);
    jest.spyOn(historyDbService, 'fillEntity').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('keeps paging past the first 2000 items on a first sync', async () => {
    const page1 = descendingTimes(nowInSeconds() - 10, 2000);
    const page2 = descendingTimes(last(page1)! - 1, 2000);
    const page3 = descendingTimes(last(page2)! - 1, 300);

    const openapi = createOpenapi(true);
    openapi.getAllTxHistory
      .mockResolvedValueOnce(createHistoryPage(page1) as any)
      .mockResolvedValueOnce(createHistoryPage(page2) as any)
      .mockResolvedValueOnce(createHistoryPage(page3) as any);

    await historyDbService.syncWithAllHistoryApi({
      openapi,
      address: ADDRESS,
      startTime: 0,
      latestTime: 0,
    });

    expect(
      openapi.getAllTxHistory.mock.calls.map(([params]) => params)
    ).toEqual([
      { id: ADDRESS, start_time: 0, page_count: 2000 },
      { id: ADDRESS, start_time: last(page1), page_count: 2000 },
      { id: ADDRESS, start_time: last(page2), page_count: 2000 },
    ]);
    expect(historyDbService.fillEntity).toHaveBeenCalledTimes(3);
    expect(syncState).toMatchObject({
      isSyncing: false,
      pendingStartTime: undefined,
    });
  });

  test('fills the whole range down to a latest item older than 15 days', async () => {
    const latestTime = nowInSeconds() - 20 * DAY;
    const page1 = descendingTimes(nowInSeconds() - 10, 2000);
    const page2 = [
      ...descendingTimes(last(page1)! - 1, 3),
      latestTime,
      latestTime - 1,
    ];

    const openapi = createOpenapi(true);
    openapi.getAllTxHistory
      .mockResolvedValueOnce(createHistoryPage(page1) as any)
      .mockResolvedValueOnce(createHistoryPage(page2) as any);

    await historyDbService.syncWithAllHistoryApi({
      openapi,
      address: ADDRESS,
      startTime: 0,
      latestTime,
    });

    expect(openapi.getAllTxHistory).toHaveBeenCalledTimes(2);
    const lastFilled = (historyDbService.fillEntity as jest.Mock).mock
      .calls[1][0].data.history_list;
    expect(lastFilled.map((i: { time_at: number }) => i.time_at)).toEqual(
      page2.slice(0, 4)
    );
  });

  test('keeps txs from the same second as the latest stored item', async () => {
    const latestTime = nowInSeconds() - 60 * 60;
    const page = createHistoryPage([
      latestTime + 30,
      latestTime,
      latestTime,
      latestTime - 1,
    ]);
    page.history_list[1].id = '0xstored';
    page.history_list[2].id = '0xsameblock';

    const openapi = createOpenapi(true);
    openapi.getAllTxHistory.mockResolvedValueOnce(page as any);

    await historyDbService.syncWithAllHistoryApi({
      openapi,
      address: ADDRESS,
      startTime: 0,
      latestTime,
    });

    expect(openapi.getAllTxHistory).toHaveBeenCalledWith({
      id: ADDRESS,
      start_time: 0,
      page_count: 500,
    });
    const filled = (historyDbService.fillEntity as jest.Mock).mock.calls[0][0]
      .data.history_list;
    expect(filled.map((i: { id: string }) => i.id)).toEqual([
      page.history_list[0].id,
      '0xstored',
      '0xsameblock',
    ]);
  });

  test('stops once a page reaches 90 days ago', async () => {
    const page1 = descendingTimes(nowInSeconds() - 91 * DAY + 1000, 2000);

    const openapi = createOpenapi(true);
    openapi.getAllTxHistory.mockResolvedValueOnce(
      createHistoryPage(page1) as any
    );

    await historyDbService.syncWithAllHistoryApi({
      openapi,
      address: ADDRESS,
      startTime: 0,
      latestTime: 0,
    });

    expect(openapi.getAllTxHistory).toHaveBeenCalledTimes(1);
    expect(historyDbService.fillEntity).toHaveBeenCalledTimes(1);
  });

  test('stops when a full page cannot move the time cursor', async () => {
    const stuckTime = nowInSeconds() - 60;

    const openapi = createOpenapi(true);
    openapi.getAllTxHistory.mockResolvedValue(
      createHistoryPage(Array(2000).fill(stuckTime)) as any
    );

    await historyDbService.syncWithAllHistoryApi({
      openapi,
      address: ADDRESS,
      startTime: stuckTime,
      latestTime: 0,
    });

    expect(openapi.getAllTxHistory).toHaveBeenCalledTimes(1);
    expect(syncState).toMatchObject({ isSyncing: false });
  });

  test('resumes an interrupted first sync from the saved page', async () => {
    const page1 = descendingTimes(nowInSeconds() - 10, 2000);
    const page2 = descendingTimes(last(page1)! - 1, 100);
    jest.spyOn(historyDbService, 'getLatestItemTime').mockResolvedValue(0);

    const openapi = createOpenapi(true);
    openapi.getAllTxHistory
      .mockResolvedValueOnce(createHistoryPage(page1) as any)
      .mockRejectedValueOnce(new Error('popup closed'));

    await expect(
      historyDbService.sync({ openapi, address: ADDRESS })
    ).rejects.toThrow('popup closed');
    expect(syncState).toMatchObject({
      isSyncing: true,
      pendingApi: 'all',
      pendingStartTime: last(page1),
      pendingLatestTime: 0,
    });

    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(page1[0]);
    openapi.hasNewTxFrom.mockResolvedValue({ has_new_tx: false });
    openapi.getAllTxHistory.mockResolvedValueOnce(
      createHistoryPage(page2) as any
    );

    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(openapi.getAllTxHistory).toHaveBeenLastCalledWith({
      id: ADDRESS,
      start_time: last(page1),
      page_count: 2000,
    });
    expect(syncState).toMatchObject({ isSyncing: false });
  });
});

describe('historyDbService 90-day retention', () => {
  const NOW = 1_800_000_000_000;
  const RETENTION_START = NOW / 1000 - HISTORY_RETENTION_SECONDS;
  const OWNER = '0x00000000000000000000000000000000000000ab';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('queries only the last 90 days, newest first', async () => {
    await historyDbService.queryRecent({
      address: OWNER.toUpperCase().replace('0X', '0x'),
    });

    expect(mockHistoryTable.where).toHaveBeenCalledWith('[owner_addr+time_at]');
    expect(mockHistoryWhereClause.between).toHaveBeenCalledWith(
      [OWNER, RETENTION_START],
      [OWNER, Dexie.maxKey]
    );
    expect(mockHistoryCollection.reverse).toHaveBeenCalled();
  });

  test('reads only the requested page of rows', async () => {
    await historyDbService.queryRecent({ address: OWNER, limit: 50 });

    expect(mockHistoryCollection.limit).toHaveBeenCalledWith(50);
    expect(mockHistoryCollection.and.mock.invocationCallOrder[0]).toBeLessThan(
      mockHistoryCollection.limit.mock.invocationCallOrder[0]
    );
    expect(mockHistoryCollection.toArray).toHaveBeenCalledTimes(1);
  });

  test('reads every row without a limit', async () => {
    await historyDbService.queryRecent({ address: OWNER });

    expect(mockHistoryCollection.limit).not.toHaveBeenCalled();
    expect(mockHistoryCollection.toArray).toHaveBeenCalledTimes(1);
  });

  test('applies the scam and chain filters', async () => {
    await historyDbService.queryRecent({
      address: OWNER,
      isFilterScam: true,
      serverChainId: 'eth',
    });
    const predicate = mockHistoryCollection.and.mock.calls[0][0];

    expect(predicate({ chain: 'eth' })).toBe(true);
    expect(predicate({ chain: 'bsc' })).toBe(false);
    expect(predicate({ chain: 'eth', is_scam: true })).toBe(false);
    expect(predicate({ chain: 'eth', is_small_tx: true })).toBe(false);
  });

  test('deletes rows older than 90 days', async () => {
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(NOW / 1000 - 60);

    await historyDbService.deleteExpired(OWNER);

    expect(mockHistoryWhereClause.between).toHaveBeenCalledWith(
      [OWNER, Dexie.minKey],
      [OWNER, RETENTION_START]
    );
    expect(mockHistoryCollection.delete).toHaveBeenCalledTimes(1);
  });

  test('keeps the newest second when every row has expired', async () => {
    const latestTime = RETENTION_START - 10 * 24 * 60 * 60;
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(latestTime);

    await historyDbService.deleteExpired(OWNER);

    // between() excludes the upper bound, so rows at latestTime survive.
    expect(mockHistoryWhereClause.between).toHaveBeenCalledWith(
      [OWNER, Dexie.minKey],
      [OWNER, latestTime]
    );
  });

  test('does nothing for an address without history', async () => {
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(undefined);

    await historyDbService.deleteExpired(OWNER);

    expect(mockHistoryCollection.delete).not.toHaveBeenCalled();
  });

  test('cleans up after a successful sync but not after a failed one', async () => {
    mockSyncDbService.getSyncState.mockResolvedValue(undefined);
    mockSyncDbService.getUpdatedAt.mockResolvedValue(NOW);
    mockSyncDbService.setUpdatedAt.mockResolvedValue(undefined);
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(LATEST_TIME);
    const deleteExpired = jest
      .spyOn(historyDbService, 'deleteExpired')
      .mockResolvedValue(0);

    const openapi = createOpenapi(false);
    openapi.hasNewTxFrom
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ has_new_tx: false });

    await expect(
      historyDbService.sync({ openapi, address: ADDRESS })
    ).rejects.toThrow('network');
    expect(deleteExpired).not.toHaveBeenCalled();

    await historyDbService.sync({ openapi, address: ADDRESS });
    expect(deleteExpired).toHaveBeenCalledWith(ADDRESS);
  });
});

describe('historyDbService daily tx count check', () => {
  const NOW = 1_800_000_000_000;
  const TO_TS = NOW / 1000;
  const FROM_TS = TO_TS - HISTORY_TX_COUNT_WINDOW_SECONDS;
  let updatedAtByScene: Record<string, number>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    updatedAtByScene = { history: NOW };
    mockSyncDbService.getSyncState.mockResolvedValue(undefined);
    mockSyncDbService.getUpdatedAt.mockImplementation(
      async ({ scene }: { scene: string }) => updatedAtByScene[scene]
    );
    mockSyncDbService.setUpdatedAt.mockImplementation(
      async ({ scene, updatedAt }: { scene: string; updatedAt: number }) => {
        updatedAtByScene[scene] = updatedAt;
      }
    );
    jest
      .spyOn(historyDbService, 'getLatestItemTime')
      .mockResolvedValue(LATEST_TIME);
    jest.spyOn(historyDbService, 'deleteExpired').mockResolvedValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('skips the check within 24 hours of the last one', async () => {
    updatedAtByScene[HISTORY_TX_COUNT_SYNC_SCENE] =
      NOW - HISTORY_TX_COUNT_CHECK_INTERVAL + 1;
    const openapi = createOpenapi(false);

    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(openapi.getTxCount).not.toHaveBeenCalled();
  });

  test('counts the last 24 hours locally and stops when nothing is missing', async () => {
    const openapi = createOpenapi(false);
    openapi.getTxCount.mockResolvedValue({ tx_count: 3, has_more: false });
    mockHistoryCollection.count.mockResolvedValue(3);
    const syncWithRealTimeApi = jest.spyOn(
      historyDbService,
      'syncWithRealTimeApi'
    );

    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(openapi.getTxCount).toHaveBeenCalledWith({
      id: ADDRESS,
      from_ts: FROM_TS,
      to_ts: TO_TS,
    });
    expect(mockHistoryWhereClause.between).toHaveBeenCalledWith(
      [ADDRESS.toLowerCase(), FROM_TS],
      [ADDRESS.toLowerCase(), TO_TS],
      true,
      true
    );
    expect(syncWithRealTimeApi).not.toHaveBeenCalled();
    expect(updatedAtByScene[HISTORY_TX_COUNT_SYNC_SCENE]).toBe(NOW);
  });

  test('refetches the last 24 hours when local history has fewer txs', async () => {
    const openapi = createOpenapi(false);
    openapi.getTxCount.mockResolvedValue({ tx_count: 5, has_more: false });
    mockHistoryCollection.count.mockResolvedValue(4);
    const syncWithRealTimeApi = jest
      .spyOn(historyDbService, 'syncWithRealTimeApi')
      .mockResolvedValue(undefined);

    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(syncWithRealTimeApi).toHaveBeenCalledWith({
      openapi,
      address: ADDRESS,
      startTime: 0,
      latestTime: FROM_TS * 1000,
    });
  });

  test('runs after the regular sync and expiry cleanup', async () => {
    const openapi = createOpenapi(false);

    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(openapi.hasNewTxFrom.mock.invocationCallOrder[0]).toBeLessThan(
      openapi.getTxCount.mock.invocationCallOrder[0]
    );
    expect(
      (historyDbService.deleteExpired as jest.Mock).mock.invocationCallOrder[0]
    ).toBeLessThan(openapi.getTxCount.mock.invocationCallOrder[0]);
  });

  test('does not retry a failed check until the next day', async () => {
    const openapi = createOpenapi(false);
    openapi.getTxCount.mockRejectedValueOnce(new Error('not found'));

    await expect(
      historyDbService.sync({ openapi, address: ADDRESS })
    ).rejects.toThrow('not found');
    await historyDbService.sync({ openapi, address: ADDRESS });

    expect(openapi.getTxCount).toHaveBeenCalledTimes(1);
  });
});
