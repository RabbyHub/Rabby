import browser from 'webextension-polyfill';
import currencyService from '@/background/service/currency';
import openapiService from '@/background/service/openapi';
import { ALARMS_SYNC_CURRENCY_LIST } from '@/background/utils/alarms';

const alarmListeners: Array<(alarm: { name: string }) => void> = [];

jest.mock('@/utils/env', () => ({
  isManifestV3: true,
}));

jest.mock('webextension-polyfill', () => ({
  alarms: {
    clear: jest.fn(),
    create: jest.fn(),
    onAlarm: {
      addListener: jest.fn((listener) => alarmListeners.push(listener)),
    },
  },
}));

jest.mock('@/background/utils', () => ({
  createPersistStore: jest.fn().mockResolvedValue({
    currency: 'USD',
    currencyList: [],
    updatedAt: 0,
  }),
  patchPersistStore: jest.fn((store, partials) => {
    Object.assign(store, partials);
  }),
}));

jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: {
    getCurrencyList: jest.fn().mockResolvedValue([]),
  },
}));

describe('currency service scheduling', () => {
  test('defers MV3 synchronization until the currency alarm fires', async () => {
    await currencyService.init();

    expect(openapiService.getCurrencyList).not.toHaveBeenCalled();
    expect(browser.alarms.create).toHaveBeenCalledWith(
      ALARMS_SYNC_CURRENCY_LIST,
      {
        delayInMinutes: 60,
        periodInMinutes: 60,
      }
    );

    alarmListeners.forEach((listener) =>
      listener({ name: ALARMS_SYNC_CURRENCY_LIST })
    );
    await Promise.resolve();

    expect(openapiService.getCurrencyList).toHaveBeenCalledTimes(1);
  });
});
