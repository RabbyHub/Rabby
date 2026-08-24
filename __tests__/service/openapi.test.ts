const mockLegacyOpenapiStore = {
  host: 'https://api.example.com',
  testnetHost: 'https://legacy-testnet.example.com',
  apiKey: 'key',
  apiTime: 1,
};
const mockReconfigure = jest.fn().mockResolvedValue(undefined);

jest.mock('background/utils', () => ({
  createPersistStore: jest.fn().mockResolvedValue(mockLegacyOpenapiStore),
  patchPersistStore: jest.fn((store, partials) => {
    Object.assign(store, partials);
  }),
}));

jest.mock('@/services/openapi', () => {
  const actual = jest.requireActual('@/services/openapi');
  return {
    ...actual,
    createOpenapiRuntime: jest.fn(() => ({
      openapi: { initSync: jest.fn() },
      ready: Promise.resolve(),
      reconfigure: mockReconfigure,
      dispose: jest.fn(),
    })),
  };
});

import {
  getOpenapiStore,
  initializeOpenapiStore,
  patchOpenapiStore,
} from '@/background/service/openapi';
import { createPersistStore } from 'background/utils';

describe('background OpenAPI store', () => {
  beforeEach(() => {
    mockReconfigure.mockClear();
  });

  test('removes the legacy testnet host during initialization', async () => {
    await initializeOpenapiStore();

    expect(mockLegacyOpenapiStore).not.toHaveProperty('testnetHost');
    expect(getOpenapiStore()).toEqual({
      host: 'https://api.example.com',
      apiKey: 'key',
      apiTime: 1,
    });
    expect(createPersistStore).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'openapi',
        broadcastKeys: ['host', 'apiKey', 'apiTime'],
      })
    );
  });

  test('reconfigures the background client for UI identity updates', async () => {
    await patchOpenapiStore({
      apiKey: 'next-key',
      apiTime: 2,
    });

    expect(mockReconfigure).toHaveBeenCalledTimes(1);
    expect(getOpenapiStore()).toMatchObject({
      apiKey: 'next-key',
      apiTime: 2,
    });
  });
});
