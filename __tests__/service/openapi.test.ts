const mockLegacyOpenapiStore = {
  host: 'https://api.example.com',
  testnetHost: 'https://legacy-testnet.example.com',
  apiKey: 'key',
  apiTime: 1,
};

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
      reconfigure: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
    })),
  };
});

import {
  getOpenapiStore,
  initializeOpenapiStore,
} from '@/background/service/openapi';
import { createPersistStore } from 'background/utils';

describe('background OpenAPI store', () => {
  test('removes the legacy testnet host during initialization', async () => {
    await initializeOpenapiStore();

    expect(mockLegacyOpenapiStore).not.toHaveProperty('testnetHost');
    expect(getOpenapiStore()).toEqual({ host: 'https://api.example.com' });
    expect(createPersistStore).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'openapi',
        broadcastKeys: ['host'],
      })
    );
  });
});
