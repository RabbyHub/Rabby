let mockStore: any;
const mockInit = jest.fn().mockResolvedValue(undefined);
const mockInstances: any[] = [];

jest.mock('@rabby-wallet/rabby-api', () => {
  return {
    OpenApiService: class MockOpenApiService {
      init = mockInit;
      initSync = jest.fn();
      getHost = jest.fn(() => mockStore.host);
      setHost = jest.fn(async (host: string) => {
        mockStore.host = host;
      });
      setAPIKey = jest.fn(async (apiKey: string) => {
        mockStore.apiKey = apiKey;
      });
      setAPITime = jest.fn(async (apiTime: number) => {
        mockStore.apiTime = apiTime;
      });

      constructor(options: any) {
        mockStore = options.store;
        mockInstances.push(this);
      }
    },
  };
});

jest.mock('@rabby-wallet/rabby-api/dist/plugins/web-sign', () => ({
  WebSignApiPlugin: {},
}));

import { createOpenapiRuntime } from '@/services/openapi';

describe('OpenAPI runtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInstances.splice(0);
  });

  test('hydrates and persists the OpenAPI identity shared with background', async () => {
    let resolveCommit!: () => void;
    let blockCommit = true;
    const commit = jest.fn(() => {
      if (!blockCommit) return Promise.resolve();
      return new Promise<void>((resolve) => {
        resolveCommit = resolve;
      });
    });
    let onUpdate: ((update: any) => void) | undefined;
    let onReconnect: (() => void) | undefined;
    const load = jest.fn().mockResolvedValue({
      origin: 'background-1',
      revision: 1,
      state: {
        host: 'https://api.example.com',
        apiKey: 'background-key',
        apiTime: 100,
      },
    });
    const runtime = createOpenapiRuntime({
      kind: 'ui',
      load,
      commit,
      subscribe(listener) {
        onUpdate = listener;
        return jest.fn();
      },
      onReconnect(listener) {
        onReconnect = listener;
        return jest.fn();
      },
    });

    await runtime.ready;
    await expect(runtime.openapi.getHost()).resolves.toBe(
      'https://api.example.com'
    );
    expect(mockStore.apiKey).toBe('background-key');
    expect(mockStore.apiTime).toBe(100);

    const setHost = runtime.openapi.setHost('https://local.example.com');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(commit).toHaveBeenCalledWith({
      host: 'https://local.example.com',
    });
    let hostWasPersisted = false;
    void setHost.then(() => {
      hostWasPersisted = true;
    });
    await Promise.resolve();
    expect(hostWasPersisted).toBe(false);
    blockCommit = false;
    resolveCommit();
    await setHost;
    expect(hostWasPersisted).toBe(true);

    await runtime.openapi.setAPIKey('ui-rotated-key');
    expect(commit).toHaveBeenLastCalledWith({ apiKey: 'ui-rotated-key' });
    await runtime.openapi.setAPITime(101);
    expect(commit).toHaveBeenLastCalledWith({ apiTime: 101 });

    onUpdate?.({
      origin: 'background-1',
      revision: 2,
      partials: {
        host: 'https://remote.example.com',
        apiKey: 'remote-key',
        apiTime: 200,
      },
    });
    await expect(runtime.openapi.getHost()).resolves.toBe(
      'https://remote.example.com'
    );
    expect(mockStore.apiKey).toBe('remote-key');
    expect(mockStore.apiTime).toBe(200);
    expect(mockInstances[0].initSync).toHaveBeenCalledTimes(1);

    onUpdate?.({
      origin: 'background-2',
      revision: 1,
      partials: { apiKey: 'partial-key' },
    });
    load.mockResolvedValue({
      origin: 'background-2',
      revision: 1,
      state: {
        host: 'https://restarted.example.com',
        apiKey: 'snapshot-key',
        apiTime: 300,
      },
    });
    onReconnect?.();
    await Promise.resolve();
    await expect(runtime.openapi.getHost()).resolves.toBe(
      'https://restarted.example.com'
    );
    expect(mockStore.apiKey).toBe('snapshot-key');
    expect(mockStore.apiTime).toBe(300);

    runtime.dispose();
  });

  test('initializes and reconfigures the background client', async () => {
    const initializeStore = jest.fn().mockResolvedValue(undefined);
    const runtime = createOpenapiRuntime({
      kind: 'background',
      store: {
        host: 'https://api.example.com',
        apiKey: 'key',
        apiTime: 1,
      },
      initializeStore,
    });

    await runtime.ready;
    expect(initializeStore).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(runtime.openapi).toBe(mockInstances[0]);

    await runtime.reconfigure();
    expect(mockInstances[0].initSync).toHaveBeenCalledTimes(1);
  });
});
