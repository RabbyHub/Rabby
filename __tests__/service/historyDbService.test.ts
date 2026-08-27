const mockSyncDbService = {
  getSyncState: jest.fn(),
  getUpdatedAt: jest.fn(),
  setUpdatedAt: jest.fn(),
  updateSyncState: jest.fn(),
};

jest.mock('@/db', () => ({
  db: {
    history: {},
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

const ADDRESS = '0x0000000000000000000000000000000000000001';
const LATEST_TIME = 2_000_000;

const createOpenapi = (hasNew: boolean) => {
  const openapi = {
    hasNewTxFrom: jest.fn().mockResolvedValue({
      has_new_tx: hasNew,
    }),
    getAllTxHistory: jest.fn(),
    listTxHisotry: jest.fn(),
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
    expect(syncWithRealTimeApi).toHaveBeenCalledTimes(1);
    expect(syncWithAllHistoryApi).not.toHaveBeenCalled();
    expect(openapi.hasNewTxFrom.mock.invocationCallOrder[0]).toBeLessThan(
      syncWithRealTimeApi.mock.invocationCallOrder[0]
    );
  });

  test('uses the full API before realtime reconciliation after a stale sync', async () => {
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
    expect(syncWithRealTimeApi).toHaveBeenCalledTimes(1);
    expect(syncWithAllHistoryApi.mock.invocationCallOrder[0]).toBeLessThan(
      syncWithRealTimeApi.mock.invocationCallOrder[0]
    );
  });
});
